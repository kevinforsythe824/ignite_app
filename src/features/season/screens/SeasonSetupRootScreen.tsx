import { NavigationContainer, NavigationIndependentTree } from '@react-navigation/native';
import React, { createContext, useCallback, useContext } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors } from '../../../shared/theme';
import { SeasonSetupFlow } from '../composition/SeasonSetupFlow';
import type { SeasonSetupParticipationReadyHandler } from '../state/SeasonSetupSubmissionProvider';
import { useSeasonParticipation } from '../state/SeasonParticipationProvider';
import type { QuizzerSeasonParticipationCreator } from '../repositories/quizzerSeasonParticipationCreator';
import type { SeasonSetupCatalogRepository } from '../repositories/seasonSetupCatalogRepository';

export interface SeasonSetupRootDependencies {
  catalogRepository?: SeasonSetupCatalogRepository;
  participationCreator?: QuizzerSeasonParticipationCreator;
}

export const SeasonSetupRootDependenciesContext = createContext<SeasonSetupRootDependencies>(
  {},
);

/**
 * Root Season Setup screen.
 * Season id, calendar date, and session identity come from the Season session.
 * The wizard stack is an independent navigation tree so its steps cannot
 * navigate the account root. Success refreshes the Season session.
 */
export function SeasonSetupRootScreen(): React.JSX.Element {
  const { session, acceptParticipationReady } = useSeasonParticipation();
  const dependencies = useContext(SeasonSetupRootDependenciesContext);
  const onParticipationReady = useCallback<SeasonSetupParticipationReadyHandler>(
    (participation) =>
      acceptParticipationReady({
        quizzerId: participation.quizzerId,
        seasonId: participation.seasonId,
      }),
    [acceptParticipationReady],
  );

  if (session.status !== 'setupRequired') {
    return (
      <View
        accessibilityRole="progressbar"
        style={styles.holding}
        testID="season-setup-root"
      >
        <ActivityIndicator color={colors.navy} size="large" />
      </View>
    );
  }

  const sessionIdentityKey = `${session.quizzerId}:${session.season.seasonId}`;

  return (
    <View style={styles.root} testID="season-setup-root">
      <NavigationIndependentTree>
        <NavigationContainer>
          <SeasonSetupFlow
            calendarDate={session.calendarDate}
            catalogRepository={dependencies.catalogRepository}
            onParticipationReady={onParticipationReady}
            participationCreator={dependencies.participationCreator}
            resolvedSeasonId={session.season.seasonId}
            sessionIdentityKey={sessionIdentityKey}
          />
        </NavigationContainer>
      </NavigationIndependentTree>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  holding: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.authBackgroundStart,
  },
});
