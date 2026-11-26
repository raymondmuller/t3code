import type {
	OrchestrationMessageContext,
	OrchestrationV2ProjectedTurnItem,
	OrchestrationV2TurnCapabilities,
} from "@t3tools/contracts";

import type { ComposerDraftContent } from "../../state/use-composer-drafts";

type UserMessageItem = Extract<OrchestrationV2ProjectedTurnItem["item"], { type: "user_message" }>;

/** Withdraw is offered only for a steer the agent has not read, on a provider that can take it back. */
export function canWithdrawSteer(input: {
	readonly projectedItem: OrchestrationV2ProjectedTurnItem;
	readonly threadId: string;
	readonly capabilities:
		| { readonly turns: Pick<OrchestrationV2TurnCapabilities, "canWithdrawUnreadSteer"> }
		| undefined;
	readonly permitted: boolean;
}): boolean {
	const { item, sourceThreadId } = input.projectedItem;
	return (
		input.permitted &&
		sourceThreadId === input.threadId &&
		item.type === "user_message" &&
		item.status === "pending" &&
		item.withdrawn !== true &&
		(item.inputIntent === "steer" || item.inputIntent === "promoted_queued_to_steer") &&
		input.capabilities?.turns.canWithdrawUnreadSteer === true
	);
}

/**
 * The composer content a withdrawn steer restores. Its attachments were already uploaded and
 * have no local draft file, so they stay behind, along with the context chips bound to them.
 */
export function withdrawnSteerDraftContent(
	message: Pick<UserMessageItem, "text" | "context" | "attachments">,
): { readonly content: ComposerDraftContent; readonly droppedAttachmentCount: number } {
	const records = message.context?.records.filter((record) => !("attachmentId" in record)) ?? [];
	const context: OrchestrationMessageContext | undefined =
		records.length === 0 ? undefined : { version: 1, records };
	return {
		content: { text: message.text, ...(context ? { context } : {}), attachments: [] },
		droppedAttachmentCount: message.attachments.length,
	};
}
