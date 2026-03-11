import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LandingPage } from '../components/LandingPage';

describe('LandingPage', () => {
  it('renders the title and subtitle', () => {
    render(<LandingPage onJoin={vi.fn()} />);
    expect(screen.getByText('CollabDraw')).toBeInTheDocument();
    expect(screen.getByText(/enter your name/i)).toBeInTheDocument();
  });

  it('renders an input and a Join button', () => {
    render(<LandingPage onJoin={vi.fn()} />);
    expect(screen.getByPlaceholderText(/your name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join/i })).toBeInTheDocument();
  });

  it('Join button is disabled when input is empty', () => {
    render(<LandingPage onJoin={vi.fn()} />);
    expect(screen.getByRole('button', { name: /join/i })).toBeDisabled();
  });

  it('Join button is disabled when input contains only whitespace', async () => {
    render(<LandingPage onJoin={vi.fn()} />);
    const input = screen.getByPlaceholderText(/your name/i);
    await userEvent.type(input, '   ');
    expect(screen.getByRole('button', { name: /join/i })).toBeDisabled();
  });

  it('Join button becomes enabled when a name is typed', async () => {
    render(<LandingPage onJoin={vi.fn()} />);
    const input = screen.getByPlaceholderText(/your name/i);
    await userEvent.type(input, 'Alice');
    expect(screen.getByRole('button', { name: /join/i })).toBeEnabled();
  });

  it('calls onJoin with the trimmed name on form submit', async () => {
    const onJoin = vi.fn();
    render(<LandingPage onJoin={onJoin} />);
    const input = screen.getByPlaceholderText(/your name/i);
    await userEvent.type(input, '  Bob  ');
    await userEvent.click(screen.getByRole('button', { name: /join/i }));
    expect(onJoin).toHaveBeenCalledOnce();
    expect(onJoin).toHaveBeenCalledWith('Bob');
  });

  it('does not call onJoin for whitespace-only input', async () => {
    const onJoin = vi.fn();
    render(<LandingPage onJoin={onJoin} />);
    const input = screen.getByPlaceholderText(/your name/i);
    await userEvent.type(input, '   ');
    await userEvent.click(screen.getByRole('button', { name: /join/i }));
    expect(onJoin).not.toHaveBeenCalled();
  });

  it('input enforces maxLength of 64', () => {
    render(<LandingPage onJoin={vi.fn()} />);
    const input = screen.getByPlaceholderText(/your name/i) as HTMLInputElement;
    expect(input.maxLength).toBe(64);
  });
});
