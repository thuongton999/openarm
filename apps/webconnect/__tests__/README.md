# Test Suite

Centralized test directory for the WebConnect application.

## Structure

```
__tests__/
├── protocol/          # Protocol layer tests
│   ├── checksum.test.ts
│   └── packet.test.ts
└── utils/             # Utility function tests
    └── math.test.ts
```

## Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test __tests__/protocol/checksum.test.ts

# Run tests in watch mode
bun test --watch

# Run tests with coverage (if configured)
bun test --coverage
```

## Test Coverage

### Protocol Tests (12 tests)
- **Checksum:** XOR calculation, verification, edge cases
- **Packet Encoding:** Angles to binary, sync word, command, checksum
- **Packet Parsing:** Validation, error handling, incomplete packets

### Utility Tests (12 tests)
- **Math Conversions:** Radians/degrees with memoization
- **Clamping:** Value constraints
- **Interpolation:** Linear interpolation (lerp)
- **Range Mapping:** Value mapping between ranges
- **Rounding:** Decimal precision
- **Approximation:** Float comparison with epsilon

## Test Metrics

- **Total Tests:** 24
- **Pass Rate:** 100%
- **Execution Time:** ~150-200ms
- **Assertions:** 55 expect() calls

## Writing Tests

### Test Structure

```typescript
import { describe, test, expect } from 'bun:test';
import { functionToTest } from '../../src/lib/module';

describe('Module Name', () => {
  test('should do something', () => {
    const result = functionToTest(input);
    expect(result).toBe(expected);
  });
});
```

### Best Practices

1. **Organize by module** - Match src/lib structure
2. **Descriptive names** - Clear test descriptions
3. **AAA Pattern** - Arrange, Act, Assert
4. **Edge cases** - Test boundaries and errors
5. **Isolation** - Each test independent
6. **Fast execution** - Keep tests under 200ms total

### Test Organization

**DO:** Mirror source structure
```
src/lib/protocol/packet.ts
__tests__/protocol/packet.test.ts
```

**DON'T:** Scatter tests
```
src/lib/protocol/packet.test.ts  ❌
tests/packet.test.ts              ❌
```

## Future Test Additions

### Unit Tests
- [ ] Serial reader FSM states
- [ ] Serial writer throttling
- [ ] URDF loader path normalization
- [ ] IK solver joint limits
- [ ] State store updates

### Integration Tests
- [ ] Component mounting (Svelte Testing Library)
- [ ] Store interactions
- [ ] End-to-end packet flow

### Performance Tests
- [ ] Packet encoding benchmark (10k iterations < 100ms)
- [ ] Math conversion performance
- [ ] Memory leak detection

## CI/CD Integration

```yaml
# Example GitHub Actions
- name: Run tests
  run: bun test
  
- name: Type check
  run: bun run check
  
- name: Lint
  run: bun run biome:check
```

## Status

✅ **24 tests passing**
✅ **100% pass rate**
✅ **Centralized organization**
✅ **Fast execution** (~150ms)

