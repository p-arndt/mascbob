<script lang="ts">
	import { onMount } from 'svelte';
	import { Mascot, type Mood } from '$lib/index.js';

	type Mode = 'off' | 'mic' | 'sim';
	type Status = 'idle' | 'requesting' | 'denied' | 'unsupported' | 'error';

	const BARS = 28;

	let mode = $state<Mode>('off');
	let status = $state<Status>('idle');
	let level = $state(0);
	let speaking = $state(false);
	let history = $state<number[]>(Array(BARS).fill(0));

	let stream: MediaStream | undefined;
	let audio: AudioContext | undefined;
	let frame = 0;
	let simTimer: ReturnType<typeof setInterval> | undefined;

	const mood: Mood = $derived(
		mode === 'sim' ? 'talking' : mode === 'mic' ? (speaking ? 'talking' : 'listening') : 'idle'
	);

	function push(value: number) {
		history = [...history.slice(1), value];
	}

	function stop() {
		cancelAnimationFrame(frame);
		clearInterval(simTimer);
		stream?.getTracks().forEach((t) => t.stop());
		void audio?.close();
		stream = undefined;
		audio = undefined;
		level = 0;
		speaking = false;
		history = Array(BARS).fill(0);
		mode = 'off';
	}

	async function startMic() {
		stop();
		if (!navigator.mediaDevices?.getUserMedia || typeof AudioContext === 'undefined') {
			status = 'unsupported';
			return;
		}
		status = 'requesting';
		try {
			stream = await navigator.mediaDevices.getUserMedia({
				audio: { echoCancellation: true, noiseSuppression: true }
			});
		} catch (e) {
			const name = e instanceof DOMException ? e.name : '';
			status = name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'error';
			return;
		}
		audio = new AudioContext();
		const analyser = audio.createAnalyser();
		analyser.fftSize = 1024;
		audio.createMediaStreamSource(stream).connect(analyser);
		const samples = new Float32Array(analyser.fftSize);
		let lastVoice = 0;

		const tick = (now: number) => {
			analyser.getFloatTimeDomainData(samples);
			let sum = 0;
			for (const s of samples) sum += s * s;
			const rms = Math.sqrt(sum / samples.length);
			// Gate out room noise, then stretch typical speech levels (~0.02..0.2) across 0..1.
			const target = Math.min(1, Math.max(0, (rms - 0.012) * 7) ** 0.8);
			// Open fast, close slower: mouths snap open on syllables but don't flicker shut.
			level += (target - level) * (target > level ? 0.55 : 0.18);
			if (level > 0.08) lastVoice = now;
			// Hysteresis keeps the mood from flapping between words.
			speaking = now - lastVoice < 450;
			push(level);
			frame = requestAnimationFrame(tick);
		};
		mode = 'mic';
		status = 'idle';
		frame = requestAnimationFrame(tick);
	}

	function startSim() {
		stop();
		status = 'idle';
		mode = 'sim';
		// The mascot animates its own mouth without `level`; the bars only mirror that for the eye.
		simTimer = setInterval(() => push(0.15 + Math.random() * 0.7), 70);
	}

	function toggleMic() {
		if (mode === 'mic') stop();
		else void startMic();
	}
	function toggleSim() {
		if (mode === 'sim') stop();
		else startSim();
	}

	// onDestroy would also run during SSR, where the browser audio APIs don't exist.
	onMount(() => stop);

	const statusText = $derived(
		mode === 'mic'
			? speaking
				? 'Lip-syncing to your voice'
				: 'Listening… say something'
			: mode === 'sim'
				? 'Simulated speech, no microphone'
				: status === 'requesting'
					? 'Waiting for microphone permission…'
					: status === 'denied'
						? 'Microphone access was denied. Try “Simulate speech” instead.'
						: status === 'unsupported'
							? 'This browser can’t capture audio here. Try “Simulate speech”.'
							: status === 'error'
								? 'No microphone found. Try “Simulate speech”.'
								: 'Nothing leaves your device; audio is analyzed locally.'
	);
</script>

<div class="talk glass">
	<div class="copy">
		<span class="kicker">Voice</span>
		<h2>Talk to it.</h2>
		<p>
			Feed any audio amplitude into <code>level</code> and the mouth follows syllable by syllable.
			This demo reads your microphone through a Web Audio <code>AnalyserNode</code>, smooths the RMS
			and hands it over 60 times a second.
		</p>
		<div class="buttons">
			<button
				class="btn-primary mic"
				class:live={mode === 'mic'}
				onclick={toggleMic}
				disabled={status === 'requesting'}
				aria-pressed={mode === 'mic'}
			>
				<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
					<rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
					<path
						d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linecap="round"
					/>
				</svg>
				{mode === 'mic' ? 'Stop microphone' : 'Use microphone'}
			</button>
			<button class="btn-ghost" onclick={toggleSim} aria-pressed={mode === 'sim'}>
				{mode === 'sim' ? 'Stop' : 'Simulate speech'}
			</button>
		</div>
		<p
			class="status"
			class:warn={status === 'denied' || status === 'unsupported' || status === 'error'}
			role="status"
		>
			<span class="led" class:on={mode !== 'off'}></span>
			{statusText}
		</p>
	</div>

	<div class="demo">
		<div class="ring" class:on={mode !== 'off'} style:--l={level} aria-hidden="true"></div>
		<Mascot
			{mood}
			level={mode === 'mic' ? level : undefined}
			theme="noir"
			shape="orb"
			accessories={['headphones']}
			size="min(230px, 56vw)"
			interactive={false}
			label="mascott listening"
		/>
		<div class="meter" aria-hidden="true">
			{#each history as v, i (i)}
				<span style:--v={v}></span>
			{/each}
		</div>
	</div>
</div>

<style>
	.talk {
		display: grid;
		grid-template-columns: 1.1fr 1fr;
		gap: 2rem;
		align-items: center;
		padding: clamp(1.5rem, 4vw, 3rem);
		overflow: hidden;
	}
	.kicker {
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #f0abfc;
	}
	h2 {
		font-size: clamp(2rem, 4vw, 3rem);
		letter-spacing: -0.035em;
		margin: 0.4rem 0 0.8rem;
		line-height: 1.05;
	}
	.copy > p {
		color: var(--text-2);
		line-height: 1.6;
		margin: 0;
		max-width: 32rem;
	}
	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		margin: 1.6rem 0 1rem;
	}
	.mic {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}
	.mic.live {
		background: linear-gradient(120deg, #fda4af, #f0abfc);
		box-shadow: 0 0 0 4px rgb(253 164 175 / 0.18);
	}
	.status {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		font-size: 0.88rem;
		color: var(--text-3);
		margin: 0;
		min-height: 1.4em;
	}
	.status.warn {
		color: #fdba74;
	}
	.led {
		flex: none;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: rgb(255 255 255 / 0.2);
		transition:
			background 0.2s,
			box-shadow 0.2s;
	}
	.led.on {
		background: #4ade80;
		box-shadow: 0 0 10px #4ade80;
	}

	.demo {
		position: relative;
		display: grid;
		place-items: center;
		gap: 1.2rem;
		padding: 1rem 0;
	}
	.ring {
		position: absolute;
		top: 50%;
		left: 50%;
		width: min(300px, 70vw);
		aspect-ratio: 1;
		border-radius: 50%;
		translate: -50% -60%;
		background: radial-gradient(circle, rgb(240 171 252 / 0.28), transparent 65%);
		scale: calc(0.85 + var(--l, 0) * 0.35);
		opacity: 0.5;
		transition:
			opacity 0.3s,
			scale 0.08s linear;
	}
	.ring.on {
		opacity: 1;
	}
	.meter {
		display: flex;
		align-items: center;
		gap: 3px;
		height: 36px;
	}
	.meter span {
		width: 4px;
		height: calc(4px + var(--v) * 32px);
		border-radius: 999px;
		background: linear-gradient(#f0abfc, #7cf3ff);
		opacity: calc(0.35 + var(--v) * 0.65);
	}

	@media (max-width: 900px) {
		.talk {
			grid-template-columns: 1fr;
			text-align: center;
		}
		.copy > p {
			margin-inline: auto;
		}
		.buttons,
		.status {
			justify-content: center;
		}
		.demo {
			order: -1;
		}
	}
</style>
