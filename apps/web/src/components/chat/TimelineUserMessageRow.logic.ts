import { type ChatFileAttachment, type ChatImageAttachment } from "../../types";
import type {
	ComposerContextRecord,
	KnownComposerContextRecord,
	OrchestrationV2TurnItem,
} from "@t3tools/contracts";
import type { ThreadStructure } from "@t3tools/client-runtime/state/shell";
import { msg } from "gt-react";
import { m, type MessageResolver } from "~/i18n/messages";
import { asKnownContextRecord } from "~/lib/composerContextRecords";

export function userMessageFileLabel(
	file: Pick<ChatFileAttachment, "name" | "source">,
	resolve: MessageResolver = m,
) {
	return file.source?._tag === "pasted-text" ? resolve(msg("Pasted text")) : file.name;
}

export function resolvePreviewAnnotationImage(input: {
	record: Extract<KnownComposerContextRecord, { kind: "preview-annotation" }>;
	recordsById: ReadonlyMap<string, ComposerContextRecord>;
	userImages: ReadonlyArray<ChatImageAttachment>;
	previewImages: ReadonlyArray<ChatImageAttachment>;
	annotationRecordIds: ReadonlyArray<string>;
}): ChatImageAttachment | null {
	const screenshotRecord = input.record.screenshotContextId
		? asKnownContextRecord(input.recordsById.get(input.record.screenshotContextId))
		: undefined;
	return (
		(screenshotRecord?.kind === "image"
			? input.userImages.find((image) => image.id === screenshotRecord.attachmentId)
			: undefined) ??
		input.previewImages.find(
			(image) => image.name === `preview-annotation-${input.record.annotationId}.png`,
		) ??
		input.previewImages[input.annotationRecordIds.indexOf(input.record.contextId)] ??
		null
	);
}

/** The server's own check: an unread steer whose provider session can take it back. */
export function steerCanBeWithdrawn(
	projection: Pick<ThreadStructure, "providerThreads" | "providerSessions"> | null,
	item: OrchestrationV2TurnItem | undefined,
): boolean {
	if (
		item?.type !== "user_message" ||
		(item.inputIntent !== "steer" && item.inputIntent !== "promoted_queued_to_steer") ||
		item.status !== "pending" ||
		item.withdrawn === true ||
		item.providerThreadId === null ||
		projection === null
	)
		return false;
	const sessionId = projection.providerThreads.find(
		(thread) => thread.id === item.providerThreadId,
	)?.providerSessionId;
	return (
		sessionId != null &&
		projection.providerSessions.find((session) => session.id === sessionId)?.capabilities.turns
			.canWithdrawUnreadSteer === true
	);
}
