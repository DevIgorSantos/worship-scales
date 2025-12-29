export const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export interface ParsedLine {
    type: 'chords' | 'lyrics' | 'empty' | 'header';
    content: string;
}

export function isChordLine(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed) return false;

    // Pattern to match common chords (C, Cm, C#m, C/E, G7M, etc.)
    // This is a heuristic: if a line looks like it's mostly chords with spaces, it's a chord line.
    // We check if "words" in the line look like chords.
    const tokens = trimmed.split(/\s+/);

    // Header lines are definitely not chords
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) return false;

    // Count how many tokens look like chords
    const chordPattern = /^([A-G][b#]?(?:m|M|maj|min|dim|aug|sus|add|\d)*)(?:\/[A-G][b#]?)?$/;
    let chordCount = 0;

    for (const token of tokens) {
        if (chordPattern.test(token)) {
            chordCount++;
        }
    }

    // If more than 50% of tokens are chords, or if it's sparse chords over lyrics (spacing), it's a chord line.
    return chordCount / tokens.length >= 0.5;
}

export function parseSong(content: string): ParsedLine[] {
    if (!content) return [];

    const lines = content.split(/\r?\n/);
    return lines.map(line => {
        const trimmed = line.trim();
        if (trimmed === '') return { type: 'empty', content: line };
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) return { type: 'header', content: line };
        if (isChordLine(line)) return { type: 'chords', content: line };
        return { type: 'lyrics', content: line };
    });
}

export function transposeNote(note: string, semitones: number): string {
    const isFlat = note.includes('b');
    const scale = isFlat ? NOTES_FLAT : NOTES_SHARP;
    const index = scale.indexOf(note);

    if (index === -1) return note; // Return original if not recognized

    let newIndex = (index + semitones) % 12;
    if (newIndex < 0) newIndex += 12;

    // Try to stick to the same sharp/flat convention if possible, or switch if needed for legibility?
    // For simplicity, return from the same scale.
    return scale[newIndex];
}

// Basic normalization to standard sharp keys for calculation simplicty (C, C#, D...)
const NORM_MAP: Record<string, string> = {
    'Ab': 'G#', 'Bb': 'A#', 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Cb': 'B', 'Fb': 'E', 'B#': 'C', 'E#': 'F'
};

export function normalizeKey(key: string): string {
    if (!key) return 'C';
    // Remove 'm' if minor, we just want the root for distance calc usually, or handle relative minors?
    // Let's assume major keys for simplicty of UI selector, or treat Am as A.
    // The Cifra Club selector usually just lists Major chords C C# D...
    const root = key.replace(/m$/, '').replace(/M$/, '');
    return NORM_MAP[root] || root;
}

export function getSemitonesBetween(originalKey: string, targetKey: string): number {
    const normOriginal = normalizeKey(originalKey);
    const normTarget = normalizeKey(targetKey);

    const idxOriginal = NOTES_SHARP.indexOf(normOriginal);
    const idxTarget = NOTES_SHARP.indexOf(normTarget);

    if (idxOriginal === -1 || idxTarget === -1) return 0;

    let diff = idxTarget - idxOriginal;
    // Normalize to easiest path? or just standard mod 12
    return diff;
}

export function transposeChord(chord: string, semitones: number): string {
    // Split chord into root and bass (e.g., D/F#)
    const [root, bass] = chord.split('/');

    // extract local root note (e.g. "C#" from "C#m7")
    const rootMatch = root.match(/^([A-G][b#]?)(.*)$/);
    if (!rootMatch) return chord;

    const [, note, suffix] = rootMatch;
    const newRoot = transposeNote(note, semitones) + suffix;

    if (bass) {
        // transpose bass note as well
        const newBass = transposeNote(bass, semitones);
        return `${newRoot}/${newBass}`;
    }

    return newRoot;
}

export function transposeLine(line: string, semitones: number): string {
    if (semitones === 0) return line;

    // Regex to find chords:
    // Captures: Note (A-G + maybe #/b) + Suffix + maybe Bass
    // We need to be careful not to eat too much.
    // Simple heuristic: A token that looks like a chord.

    // \b is tricky with / char, let's relax regex similar to isChordLine
    // But we are in a known chord line, so we can be more aggressive?
    // Let's use the previous logic but refine it.

    const tokenRegex = /([A-G][b#]?(?:m|M|maj|min|dim|aug|sus|add|\d)*(?:\/[A-G][b#]?)?)/g;

    return line.replace(tokenRegex, (match) => {
        // Only transpose if it really looks like a chord (sanity check validation?)
        // The isChordLine check already validated the line.
        // We can just try transpose.
        return transposeChord(match, semitones);
    });
}

export function transposeSong(content: string, semitones: number): string {
    if (!content) return "";
    return content.split(/\r?\n/).map(line => transposeLine(line, semitones)).join('\n');
}

