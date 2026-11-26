import {
	ChatAttachment,
	MessageId,
	OrchestrationMessageContext,
	ThreadId,
	TurnItemId,
	type OrchestrationV2ProjectedTurnItem,
	type OrchestrationV2TurnItem,
} from "@t3tools/contracts";
import { DateTime, Schema } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { canWithdrawSteer, withdrawnSteerDraftContent } from "./withdrawSteer";

const decodeContext = Schema.decodeSync(OrchestrationMessageContext);
const decodeAttachment = Schema.decodeSync(ChatAttachment);
const threadId = ThreadId.make("thread-1");
const at = DateTime.makeUnsafe("2026-11-26T00:00:00.000Z");

type UserMessageItem = Extract<OrchestrationV2TurnItem, { type: "user_message" }>;

function steer(overrides: Partial<UserMessageItem> = {}): OrchestrationV2ProjectedTurnItem {
	const item: UserMessageItem = {
		id: TurnItemId.make("item-steer"),
		threadId,
		runId: null,
		nodeId: null,
		providerThreadId: null,
		providerTurnId: null,
		nativeItemRef: null,
		parentItemId: null,
		ordinal: 0,
		status: "pending",
		title: null,
		startedAt: at,
		completedAt: null,
		updatedAt: at,
		type: "user_message",
		messageId: MessageId.make("message-steer"),
		createdBy: "user",
		creationSource: "mobile",
		inputIntent: "steer",
		text: "Use the other API",
		attachments: [],
		...overrides,
	};
	return {
		position: 0,
		visibility: "local",
		sourceThreadId: threadId,
		sourceItemId: item.id,
		item,
	};
}

const attachment = decodeAttachment({
	type: "file",
	id: "attachment-1",
	name: "notes.txt",
	mimeType: "text/plain",
	sizeBytes: 4,
});

const withdrawable = { turns: { canWithdrawUnreadSteer: true } };

describe("canWithdrawSteer", () => {
	it("offers Withdraw for an unread steer the provider and permission allow", () => {
		const offered = (projectedItem: OrchestrationV2ProjectedTurnItem) =>
			canWithdrawSteer({ projectedItem, threadId, capabilities: withdrawable, permitted: true });
		expect(offered(steer())).toBe(true);
		expect(offered(steer({ inputIntent: "promoted_queued_to_steer" }))).toBe(true);
		expect(offered(steer({ status: "completed" }))).toBe(false);
		expect(offered(steer({ status: "cancelled", withdrawn: true }))).toBe(false);
		expect(offered(steer({ inputIntent: "turn_start" }))).toBe(false);
		expect(offered({ ...steer(), sourceThreadId: ThreadId.make("child") })).toBe(false);
	});

	it("hides Withdraw without the provider capability or permission", () => {
		const projectedItem = steer();
		expect(
			canWithdrawSteer({ projectedItem, threadId, capabilities: withdrawable, permitted: false }),
		).toBe(false);
		expect(
			canWithdrawSteer({
				projectedItem,
				threadId,
				capabilities: { turns: {} },
				permitted: true,
			}),
		).toBe(false);
		expect(
			canWithdrawSteer({ projectedItem, threadId, capabilities: undefined, permitted: true }),
		).toBe(false);
	});
});

describe("withdrawnSteerDraftContent", () => {
	it("restores the text and context but not uploaded attachments or their chips", () => {
		const context = decodeContext({
			version: 1,
			records: [
				{
					version: 1,
					contextId: "ctx-file",
					label: "notes.txt",
					kind: "file",
					attachmentId: "attachment-1",
					name: "notes.txt",
					mimeType: "text/plain",
					sizeBytes: 4,
				},
				{
					version: 1,
					contextId: "ctx-terminal",
					label: "Terminal",
					kind: "terminal",
					terminalId: "term-1",
					terminalLabel: "Terminal",
					lineStart: 1,
					lineEnd: 2,
					text: "ok",
				},
			],
		});
		const { item } = steer({ context, attachments: [attachment] });
		if (item.type !== "user_message") throw new Error("expected a user message");
		const restored = withdrawnSteerDraftContent(item);
		expect(restored.droppedAttachmentCount).toBe(1);
		expect(restored.content.text).toBe("Use the other API");
		expect(restored.content.attachments).toEqual([]);
		expect(restored.content.context?.records.map((record) => record.contextId)).toEqual([
			"ctx-terminal",
		]);
	});

	it("leaves context out when the steer had none", () => {
		const { item } = steer();
		if (item.type !== "user_message") throw new Error("expected a user message");
		expect(withdrawnSteerDraftContent(item).content).toEqual({
			text: "Use the other API",
			attachments: [],
		});
	});
});
