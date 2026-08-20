import { render } from '@testing-library/react-native';
import React from 'react';

import App from '../App';

jest.mock('../src/features/flashcards/repositories/firebaseCurriculumSource', () => {
  const { jsonCurriculumRepository } = jest.requireActual(
    '../src/features/flashcards/repositories/jsonCurriculumRepository',
  ) as typeof import('../src/features/flashcards/repositories/jsonCurriculumRepository');

  return {
    createFirebaseCurriculumSource: jest.fn(),
    firestoreCurriculumRepository: jsonCurriculumRepository,
  };
});

jest.mock('../src/features/auth', () => {
  const React = require('react');
  return {
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

describe('App', () => {
  it('renders the Luke 2 deck title and first verse reference', async () => {
    const { findByText } = await render(<App />);

    expect(await findByText('Luke 2:1-9')).toBeTruthy();
    expect(await findByText('Luke 2:1')).toBeTruthy();
  });
});
