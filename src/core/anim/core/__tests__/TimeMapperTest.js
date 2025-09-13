/**
 * @fileoverview Tests for TimeMapper interface.
 * @author Charles Gunn
 */

import { TimeMapper } from '../TimeMapper.js';

describe('TimeMapper', () => {
    describe('Interface Contract', () => {
        test('should be instantiable', () => {
            const mapper = new TimeMapper();
            expect(mapper).toBeInstanceOf(TimeMapper);
        });

        test('should throw error when remapTime is not implemented', () => {
            const mapper = new TimeMapper();
            expect(() => mapper.remapTime(0.5, 0, 1)).toThrow('Method "remapTime()" must be implemented.');
        });
    });

    describe('Custom Implementation', () => {
        test('should work with linear time mapper implementation', () => {
            class LinearTimeMapper extends TimeMapper {
                remapTime(t, t0, t1) {
                    return t0 + (t - t0) * (t1 - t0) / (t1 - t0);
                }
            }

            const mapper = new LinearTimeMapper();
            expect(mapper.remapTime(0.5, 0, 1)).toBeCloseTo(0.5);
            expect(mapper.remapTime(0.25, 0, 1)).toBeCloseTo(0.25);
            expect(mapper.remapTime(2, 0, 4)).toBeCloseTo(2);
        });

        test('should work with easing time mapper implementation', () => {
            class EaseInOutTimeMapper extends TimeMapper {
                remapTime(t, t0, t1) {
                    const normalizedT = (t - t0) / (t1 - t0);
                    const eased = normalizedT < 0.5 
                        ? 2 * normalizedT * normalizedT 
                        : -1 + (4 - 2 * normalizedT) * normalizedT;
                    return t0 + eased * (t1 - t0);
                }
            }

            const mapper = new EaseInOutTimeMapper();
            expect(mapper.remapTime(0, 0, 1)).toBeCloseTo(0);
            expect(mapper.remapTime(1, 0, 1)).toBeCloseTo(1);
            expect(mapper.remapTime(0.5, 0, 1)).toBeCloseTo(0.5);
            
            // Test easing behavior
            const quarter = mapper.remapTime(0.25, 0, 1);
            expect(quarter).toBeLessThan(0.25); // Should be slower at start
            
            const threeQuarter = mapper.remapTime(0.75, 0, 1);
            expect(threeQuarter).toBeGreaterThan(0.75); // Should be faster at end
        });

        test('should work with custom time range', () => {
            class ScaleTimeMapper extends TimeMapper {
                constructor(scale) {
                    super();
                    this.scale = scale;
                }
                
                remapTime(t, t0, t1) {
                    const normalizedT = (t - t0) / (t1 - t0);
                    return t0 + normalizedT * this.scale * (t1 - t0);
                }
            }

            const mapper = new ScaleTimeMapper(2.0);
            expect(mapper.remapTime(5, 0, 10)).toBeCloseTo(10); // 0.5 * 2.0 * 10 = 10
            expect(mapper.remapTime(2.5, 0, 10)).toBeCloseTo(5); // 0.25 * 2.0 * 10 = 5
        });
    });
});
