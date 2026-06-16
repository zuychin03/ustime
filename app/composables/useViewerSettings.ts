export type AxisMode = 'mine' | 'theirs' | 'both';

export function useViewerSettings() {
	const axisMode = useState<AxisMode>('axis-mode', () => 'mine');
	const { ctx } = useCoupleContext();

	const myZone = computed(() => ctx.value?.profile?.timezone ?? 'UTC');
	const partnerZone = computed(() => ctx.value?.partner?.timezone ?? myZone.value);

	// The zone used to lay the grid out (the "primary" axis).
	const viewerZone = computed(() =>
		axisMode.value === 'theirs' ? partnerZone.value : myZone.value
	);

	return { axisMode, myZone, partnerZone, viewerZone };
}
