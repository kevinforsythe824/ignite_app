import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { render, userEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import { feedbackCopy } from '../../../src/features/feedback/copy/feedbackCopy';
import { FeedbackError } from '../../../src/features/feedback/errors/feedbackError';
import { FeedbackRepositoryContextProvider } from '../../../src/features/feedback/hooks/useFeedbackRepository';
import { FeedbackComposeScreen } from '../../../src/features/feedback/screens/FeedbackComposeScreen';
import { HelpAndFeedbackScreen } from '../../../src/features/feedback/screens/HelpAndFeedbackScreen';
import type { ProfileStackParamList } from '../../../src/features/profile/navigation/types';
import { createFeedbackRepositoryFake } from '../../../test-utils/feedbackRepositoryFake';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

async function renderFeedbackStack(
  repository = createFeedbackRepositoryFake(),
  initial: keyof ProfileStackParamList = 'HelpAndFeedback',
) {
  const screen = await render(
    <FeedbackRepositoryContextProvider value={repository}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName={initial}>
          <Stack.Screen name="HelpAndFeedback" component={HelpAndFeedbackScreen} />
          <Stack.Screen
            name="FeedbackCompose"
            component={FeedbackComposeScreen}
            initialParams={{ category: 'bug' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </FeedbackRepositoryContextProvider>,
  );
  return { screen, repository };
}

describe('Help & Feedback screens', () => {
  it('routes each hub category to compose', async () => {
    const user = userEvent.setup();
    const { screen } = await renderFeedbackStack();

    expect(screen.getByTestId('help-feedback-supporting')).toBeTruthy();
    await user.press(screen.getByTestId('help-feedback-bug'));
    expect(await screen.findByTestId('feedback-compose-title')).toHaveTextContent(
      feedbackCopy.compose.bugTitle,
    );
  });

  it('requires a message and treats title as optional', async () => {
    const user = userEvent.setup();
    const { screen, repository } = await renderFeedbackStack(
      createFeedbackRepositoryFake(),
      'FeedbackCompose',
    );

    await user.press(screen.getByTestId('feedback-submit'));
    expect(await screen.findByText(feedbackCopy.compose.messageRequired)).toBeTruthy();
    expect(repository.submit).not.toHaveBeenCalled();

    await user.type(
      screen.getByTestId('feedback-message'),
      'Practice button did not respond during synthetic DEV testing.',
    );
    await user.press(screen.getByTestId('feedback-submit'));

    await waitFor(() => {
      expect(repository.submit).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'bug',
          title: null,
          message: 'Practice button did not respond during synthetic DEV testing.',
        }),
      );
    });
    expect(await screen.findByTestId('feedback-success-title')).toBeTruthy();
  });

  it('blocks duplicate submit while in flight', async () => {
    const user = userEvent.setup();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const repository = createFeedbackRepositoryFake();
    repository.setSubmitDelay(() => gate);
    const { screen } = await renderFeedbackStack(repository, 'FeedbackCompose');

    await user.type(
      screen.getByTestId('feedback-message'),
      'Practice button did not respond during synthetic DEV testing.',
    );
    await user.press(screen.getByTestId('feedback-submit'));
    await user.press(screen.getByTestId('feedback-submit'));
    release();

    expect(await screen.findByTestId('feedback-success-title')).toBeTruthy();
    expect(repository.submit).toHaveBeenCalledTimes(1);
  });

  it('keeps title and message on failure so retry works', async () => {
    const user = userEvent.setup();
    const repository = createFeedbackRepositoryFake({
      submitError: new FeedbackError('unavailable', feedbackCopy.errors.unavailable),
    });
    const { screen } = await renderFeedbackStack(repository, 'FeedbackCompose');

    await user.type(screen.getByTestId('feedback-title'), 'Practice button');
    await user.type(
      screen.getByTestId('feedback-message'),
      'Practice button did not respond during synthetic DEV testing.',
    );
    await user.press(screen.getByTestId('feedback-submit'));

    expect(await screen.findByTestId('feedback-error')).toHaveTextContent(
      feedbackCopy.errors.unavailable,
    );
    expect(screen.getByTestId('feedback-title').props.value).toBe('Practice button');
    expect(screen.getByTestId('feedback-message').props.value).toBe(
      'Practice button did not respond during synthetic DEV testing.',
    );

    repository.setSubmitError(null);
    await user.press(screen.getByTestId('feedback-submit'));
    expect(await screen.findByTestId('feedback-success-title')).toBeTruthy();
    expect(repository.submit).toHaveBeenCalledTimes(2);
  });

  it('announces hub rows and compose labels for assistive tech', async () => {
    const user = userEvent.setup();
    const { screen } = await renderFeedbackStack();

    expect(screen.getByTestId('help-feedback-bug').props.accessibilityRole).toBe('button');
    expect(screen.getByTestId('help-feedback-bug').props.accessibilityLabel).toBe(
      feedbackCopy.hub.reportBug,
    );

    await user.press(screen.getByTestId('help-feedback-feature'));
    expect(await screen.findByTestId('feedback-compose-title')).toHaveTextContent(
      feedbackCopy.compose.featureTitle,
    );
    expect(screen.getByLabelText(feedbackCopy.compose.titleLabel)).toBeTruthy();
    expect(screen.getByLabelText(feedbackCopy.compose.messageLabel)).toBeTruthy();
    expect(screen.getByTestId('feedback-privacy-note')).toBeTruthy();
  });
});
