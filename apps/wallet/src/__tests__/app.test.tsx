import { fireEvent, render, screen } from '@testing-library/react-native';
import { amountField, relativeDay } from '@/lib/forms';
import { Button } from '@/components/ui';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('form helpers', () => {
  test('amountField enforces policy limits in BDT', () => {
    const f = amountField(1000, 2500000);
    expect(f.safeParse('500').success).toBe(true);
    expect(f.safeParse('5').success).toBe(false); // below ৳10
    expect(f.safeParse('30000').success).toBe(false); // above ৳25,000
    expect(f.safeParse('abc').success).toBe(false);
  });

  test('relativeDay labels', () => {
    expect(relativeDay(new Date())).toBe('Today');
    const y = new Date();
    y.setDate(y.getDate() - 1);
    expect(relativeDay(y)).toBe('Yesterday');
    expect(relativeDay(null)).toBe('');
  });
});

describe('Button', () => {
  test('is accessible and fires onPress', async () => {
    const onPress = jest.fn();
    await render(<Button title="Send now" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Send now' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('does not fire when loading', async () => {
    const onPress = jest.fn();
    await render(<Button title="Pay" onPress={onPress} loading />);
    await fireEvent.press(screen.getByRole('button', { name: 'Pay' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});
