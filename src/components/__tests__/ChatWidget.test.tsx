import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatWidget } from '../ChatWidget';

describe('ChatWidget', () => {
  it('renders chat button when closed', () => {
    render(<ChatWidget />);

    const button = screen.getByLabelText('Ouvrir le chat');
    expect(button).toBeDefined();
  });

  it('opens chat when button is clicked', () => {
    render(<ChatWidget />);

    const openButton = screen.getByLabelText('Ouvrir le chat');
    fireEvent.click(openButton);

    const chatContainer = screen.getByText('Support en ligne');
    expect(chatContainer).toBeDefined();
  });

  it('sends message when send button is clicked', () => {
    render(<ChatWidget />);

    const openButton = screen.getByLabelText('Ouvrir le chat');
    fireEvent.click(openButton);

    const input = screen.getByPlaceholderText('Écrivez votre message...');
    const sendButton = screen.getByLabelText('Envoyer');

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    expect(screen.getByText('Test message')).toBeDefined();
  });
});
