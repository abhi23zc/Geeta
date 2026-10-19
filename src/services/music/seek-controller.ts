/** One in-flight native seek; newer targets replace queued work without racing completions. */
export class SeekController {
    private version = 0;
    private pending: { target: number; version: number; execute: (target: number, valid: () => boolean) => Promise<void>; resolve: () => void; reject: (error: unknown) => void } | null = null;
    private running = false;
    private changed: (target: number | null, error?: unknown) => void;
    constructor(changed: (target: number | null, error?: unknown) => void) { this.changed = changed; }
    cancel() {
        this.version++;
        this.pending?.resolve();
        this.pending = null;
        this.changed(null);
    }
    request(target: number, execute: (target: number, valid: () => boolean) => Promise<void>): Promise<void> {
        this.pending?.resolve();
        const version = ++this.version;
        this.changed(target);
        const result = new Promise<void>((resolve, reject) => { this.pending = { target, version, execute, resolve, reject }; });
        if (!this.running) void this.drain();
        return result;
    }
    private async drain() {
        this.running = true;
        while (this.pending) {
            const request = this.pending;
            const valid = () => request.version === this.version;
            try {
                await request.execute(request.target, valid);
                if (valid()) { this.pending = null; this.changed(null); request.resolve(); }
            } catch (error) {
                if (valid()) { this.pending = null; this.changed(null, error); request.reject(error); }
            }
        }
        this.running = false;
    }
}

export async function waitForSeek(valid: () => boolean, ready: () => boolean, deadline = performance.now() + 15000) {
    while (valid()) {
        if (ready()) return;
        if (performance.now() >= deadline) throw Error('Playback is taking too long. Retry to continue from this position.');
        await new Promise(resolve => setTimeout(resolve, 25));
    }
}
