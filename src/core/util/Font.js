/**
 * A minimal Font class equivalent to java.awt.Font for jReality JavaScript translation.
 * Represents fonts with family, style, and size properties.
 * 
 * @author JavaScript translation
 */

export class Font {
    /**
     * Create a Font instance.
     * @param {string} family - Font family name (e.g., "Arial", "Times New Roman")
     * @param {number} style - Font style (Font.PLAIN, Font.BOLD, Font.ITALIC)
     * @param {number} size - Font size in points
     */
    constructor(family, style, size) {
        this.family = family || Font.SANS_SERIF;
        this.style = style || Font.PLAIN;
        this.size = size || 12;
    }

    /**
     * Get the font family
     * @returns {string}
     */
    getFamily() {
        return this.family;
    }

    /**
     * Get the font style
     * @returns {number}
     */
    getStyle() {
        return this.style;
    }

    /**
     * Get the font size
     * @returns {number}
     */
    getSize() {
        return this.size;
    }

    /**
     * Check if font is bold
     * @returns {boolean}
     */
    isBold() {
        return (this.style & Font.BOLD) !== 0;
    }

    /**
     * Check if font is italic
     * @returns {boolean}
     */
    isItalic() {
        return (this.style & Font.ITALIC) !== 0;
    }

    /**
     * Check if font is plain (not bold or italic)
     * @returns {boolean}
     */
    isPlain() {
        return this.style === Font.PLAIN;
    }

    /**
     * Convert to CSS font string
     * @returns {string}
     */
    toCSSString() {
        let cssStyle = '';
        if (this.isItalic()) cssStyle += 'italic ';
        if (this.isBold()) cssStyle += 'bold ';
        return `${cssStyle}${this.size}px ${this.family}`;
    }

    /**
     * Create a new font with different size
     * @param {number} size
     * @returns {Font}
     */
    deriveFont(size) {
        return new Font(this.family, this.style, size);
    }

    /**
     * Test for equality
     * @param {Font} other
     * @returns {boolean}
     */
    equals(other) {
        return other instanceof Font &&
               this.family === other.family &&
               this.style === other.style &&
               this.size === other.size;
    }

    /**
     * Create a copy of this font
     * @returns {Font}
     */
    clone() {
        return new Font(this.family, this.style, this.size);
    }

    toString() {
        const styleNames = [];
        if (this.isBold()) styleNames.push('bold');
        if (this.isItalic()) styleNames.push('italic');
        const styleStr = styleNames.length > 0 ? styleNames.join(',') : 'plain';
        return `Font[family=${this.family}, style=${styleStr}, size=${this.size}]`;
    }
}

// Font style constants matching Java's Font class
Font.PLAIN = 0;
Font.BOLD = 1;
Font.ITALIC = 2;

// Font family constants
Font.DIALOG = "Dialog";
Font.DIALOG_INPUT = "DialogInput";
Font.SANS_SERIF = "SansSerif";
Font.SERIF = "Serif";
Font.MONOSPACED = "Monospaced";

// Default export for convenience
export default Font;
