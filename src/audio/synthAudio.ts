class CozySynthAudio {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  private ensureCtx(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playMarimbaNote(
    freq: number,
    startDelay: number,
    duration: number,
    volume: number = 0.16,
    type: OscillatorType = 'triangle'
  ): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime + startDelay;

    const osc = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const gain = ctx.createGain();
    const overtoneGain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(freq * 2, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    overtoneGain.gain.setValueAtTime(0.0001, now);
    overtoneGain.gain.linearRampToValueAtTime(volume * 0.28, now + 0.008);
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.45);

    osc.connect(gain);
    overtone.connect(overtoneGain);
    overtoneGain.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    overtone.start(now);
    osc.stop(now + duration + 0.03);
    overtone.stop(now + duration + 0.03);
  }

  playClick(): void {
    this.playMarimbaNote(520, 0, 0.07, 0.08, 'sine');
  }

  playCorrect(combo: number): void {
    // Cozy C-major pentatonic scale climbing with combo!
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
    const idx = Math.min(scale.length - 1, Math.max(0, combo - 1));
    const root = scale[idx];
    const fifth = root * 1.25;
    this.playMarimbaNote(root, 0, 0.26, 0.16, 'triangle');
    this.playMarimbaNote(fifth, 0.075, 0.34, 0.14, 'sine');
  }

  playComboMilestone(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((f, i) => {
      this.playMarimbaNote(f, i * 0.065, 0.36, 0.14, 'triangle');
    });
  }

  playWrong(): void {
    // Gentle, encouraging low wooden tap (never harsh)
    this.playMarimbaNote(246.94, 0, 0.16, 0.11, 'sine');
    this.playMarimbaNote(220.0, 0.09, 0.22, 0.09, 'sine');
  }

  playShieldSave(): void {
    this.playMarimbaNote(440, 0, 0.18, 0.12, 'sine');
    this.playMarimbaNote(659.25, 0.07, 0.28, 0.13, 'triangle');
  }

  playUpgrade(): void {
    const chord = [440, 554.37, 659.25, 880, 1108.73];
    chord.forEach((f, i) => {
      this.playMarimbaNote(f, i * 0.055, 0.38, 0.14, 'sine');
    });
  }

  playRoundComplete(): void {
    const fanfare = [
      { f: 523.25, t: 0, d: 0.2 },
      { f: 659.25, t: 0.1, d: 0.2 },
      { f: 783.99, t: 0.2, d: 0.22 },
      { f: 1046.5, t: 0.32, d: 0.55 },
    ];
    fanfare.forEach((n) => this.playMarimbaNote(n.f, n.t, n.d, 0.16, 'triangle'));
  }

  playBirdChirp(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const chirps = [
      { delay: 0, startF: 1750, endF: 2650, dur: 0.085 },
      { delay: 0.1, startF: 2100, endF: 3100, dur: 0.095 },
      { delay: 0.21, startF: 1900, endF: 2850, dur: 0.11 },
    ];
    for (const c of chirps) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t0 = now + c.delay;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(c.startF, t0);
      osc.frequency.exponentialRampToValueAtTime(c.endF, t0 + c.dur * 0.65);
      osc.frequency.exponentialRampToValueAtTime(c.startF * 1.05, t0 + c.dur);

      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(0.11, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + c.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + c.dur + 0.02);
    }
  }

  playStreakReset(): void {
    // Noticeable but friendly descending slide when streak & visitor bonus reset
    this.playMarimbaNote(392.0, 0, 0.14, 0.13, 'triangle');
    this.playMarimbaNote(293.66, 0.08, 0.16, 0.12, 'triangle');
    this.playMarimbaNote(220.0, 0.17, 0.24, 0.1, 'sine');
  }

  playCritterSound(species: 'rabbit' | 'squirrel'): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes =
      species === 'squirrel'
        ? [
            { delay: 0, startF: 1400, endF: 2300, dur: 0.065 },
            { delay: 0.08, startF: 1650, endF: 2550, dur: 0.065 },
            { delay: 0.16, startF: 1900, endF: 2800, dur: 0.08 },
          ]
        : [
            { delay: 0, startF: 740, endF: 1120, dur: 0.08 },
            { delay: 0.1, startF: 880, endF: 1320, dur: 0.11 },
          ];
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t0 = now + n.delay;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.startF, t0);
      osc.frequency.exponentialRampToValueAtTime(n.endF, t0 + n.dur);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(0.13, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + n.dur + 0.02);
    }
  }
}

export const synthAudio = new CozySynthAudio();
