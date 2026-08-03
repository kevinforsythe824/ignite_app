import { render } from '@testing-library/react-native';
import React from 'react';

import App from '../App';

describe('App', () => {
  it('renders the Luke 2 deck title and first verse reference', async () => {
    const { getByText } = await render(<App />);

    expect(getByText('Luke 2:1-9')).toBeTruthy();
    expect(getByText('Luke 2:1')).toBeTruthy();
  });
});
