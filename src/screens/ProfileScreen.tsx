import React from 'react';

import { ProfileStackNavigator } from '../features/profile/navigation/ProfileStackNavigator';

/** Profile tab entry — nested Profile + Settings stack. */
export const ProfileScreen: React.FC = () => <ProfileStackNavigator />;

export default ProfileScreen;
