import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../Input';
import { vi } from 'vitest';

describe('Input Component', () => {
  test('renders correctly', () => {
    render(<Input placeholder="Test Input" />);
    expect(screen.getByPlaceholderText('Test Input')).toBeInTheDocument();
  });

  test('shows clear button when typed into (uncontrolled)', () => {
    const { container } = render(<Input placeholder="Uncontrolled" />);
    const input = screen.getByPlaceholderText('Uncontrolled');

    // Initially no clear button
    expect(container.querySelector('div[title="Clear"]')).toBeNull();

    fireEvent.change(input, { target: { value: 'Hello' } });

    // Should now have clear button
    expect(container.querySelector('div[title="Clear"]')).toBeInTheDocument();
  });

  test('clears input when button clicked', () => {
    const handleChange = vi.fn();
    const { container } = render(<Input value="Test" onChange={handleChange} />);

    const clearBtn = container.querySelector('div[title="Clear"]');
    expect(clearBtn).toBeInTheDocument();

    // Click the clear button
    fireEvent.click(clearBtn!);

    expect(handleChange).toHaveBeenCalled();
  });
});
