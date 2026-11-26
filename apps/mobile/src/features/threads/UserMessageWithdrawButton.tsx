import { useAtomValue } from "@effect/atom-react";
import type { EnvironmentId, OrchestrationV2ProjectedTurnItem, ThreadId } from "@t3tools/contracts";
import { useGT } from "gt-react-native";
import { Pressable, type ColorValue } from "react-native";

import { SymbolView } from "../../components/ui/AppSymbol";
import { orchestrationEnvironment } from "../../state/orchestration";
import { useV2ItemSupport } from "../../state/v2-item-support";
import { canWithdrawSteer } from "./withdrawSteer";

export function UserMessageWithdrawButton(props: {
	readonly environmentId: EnvironmentId;
	readonly threadId: ThreadId;
	readonly projectedItem: OrchestrationV2ProjectedTurnItem;
	readonly withdrawing: boolean;
	readonly onWithdraw: (projectedItem: OrchestrationV2ProjectedTurnItem) => void;
	readonly tintColor: ColorValue;
}) {
	const gt = useGT();
	const support = useV2ItemSupport({
		environmentId: props.environmentId,
		sourceThreadId: props.projectedItem.sourceThreadId,
		sourceItemId: props.projectedItem.sourceItemId,
	});
	const permitted = useAtomValue(
		orchestrationEnvironment.withdrawSteer.permissionAtom(props.environmentId),
	);
	if (
		!canWithdrawSteer({
			projectedItem: props.projectedItem,
			threadId: props.threadId,
			capabilities: support.providerSession?.capabilities,
			permitted,
		})
	) {
		return null;
	}
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={gt("Withdraw steer and edit it in the composer")}
			accessibilityState={{ disabled: props.withdrawing }}
			disabled={props.withdrawing}
			hitSlop={8}
			className="size-7 items-center justify-center"
			style={{ opacity: props.withdrawing ? 0.4 : 1 }}
			onPress={() => props.onWithdraw(props.projectedItem)}
		>
			<SymbolView name="arrow.uturn.backward" size={14} tintColor={props.tintColor} />
		</Pressable>
	);
}
