import { describe, expect, it } from "vite-plus/test";
import { DateTime } from "effect";
import {
	MessageId,
	ProviderThreadId,
	RunId,
	ThreadId,
	TurnItemId,
	type OrchestrationV2TurnItem,
} from "@t3tools/contracts";

import { steerCanBeWithdrawn } from "./TimelineUserMessageRow.logic";

const now = DateTime.makeUnsafe("2026-06-20T00:00:00.000Z");
const providerThreadId = ProviderThreadId.make("provider-thread");

const steer = {
	id: TurnItemId.make("item-steer"),
	threadId: ThreadId.make("thread"),
	runId: RunId.make("run"),
	nodeId: null,
	providerThreadId,
	providerTurnId: null,
	nativeItemRef: null,
	parentItemId: null,
	ordinal: 2,
	status: "pending",
	title: null,
	startedAt: now,
	completedAt: null,
	updatedAt: now,
	type: "user_message",
	messageId: MessageId.make("message-steer"),
	inputIntent: "steer",
	text: "Use the other API",
	attachments: [],
	createdBy: "user",
	creationSource: "web",
} satisfies OrchestrationV2TurnItem;

const projection = (canWithdrawUnreadSteer: boolean | undefined) =>
	({
		providerThreads: [{ id: providerThreadId, providerSessionId: "session" }],
		providerSessions: [
			{
				id: "session",
				capabilities: {
					turns: canWithdrawUnreadSteer === undefined ? {} : { canWithdrawUnreadSteer },
				},
			},
		],
	}) as never;

describe("steerCanBeWithdrawn", () => {
	it("offers Withdraw only for an unread steer whose provider session can take it back", () => {
		expect(steerCanBeWithdrawn(projection(true), steer)).toBe(true);
		expect(
			steerCanBeWithdrawn(projection(true), { ...steer, inputIntent: "promoted_queued_to_steer" }),
		).toBe(true);

		expect(steerCanBeWithdrawn(projection(false), steer)).toBe(false);
		expect(steerCanBeWithdrawn(projection(undefined), steer)).toBe(false);
		expect(steerCanBeWithdrawn(null, steer)).toBe(false);
		expect(steerCanBeWithdrawn(projection(true), { ...steer, status: "completed" })).toBe(false);
		expect(
			steerCanBeWithdrawn(projection(true), { ...steer, status: "cancelled", withdrawn: true }),
		).toBe(false);
		expect(steerCanBeWithdrawn(projection(true), { ...steer, inputIntent: "turn_start" })).toBe(
			false,
		);
		expect(steerCanBeWithdrawn(projection(true), { ...steer, providerThreadId: null })).toBe(false);
		expect(steerCanBeWithdrawn(projection(true), undefined)).toBe(false);
	});
});
