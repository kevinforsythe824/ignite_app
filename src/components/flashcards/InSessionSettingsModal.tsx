import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '../../constants/spacing';
import { colors, radius, shadows, typography } from '../../constants/theme';

export interface InSessionSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  style?: StyleProp<ViewStyle>;
}

const CLOSE_ICON_SIZE = 24;

/**
 * In-session settings sheet shell. Controls will be wired in a follow-up.
 */
export const InSessionSettingsModal: React.FC<InSessionSettingsModalProps> = ({
  visible,
  onClose,
  style,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss session settings"
        />

        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) },
            style,
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              Session Settings
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={spacing.sm}
              accessibilityRole="button"
              accessibilityLabel="Close session settings"
              style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
            >
              <Ionicons name="close" size={CLOSE_ICON_SIZE} color={colors.navy} />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(10, 37, 64, 0.35)',
  },
  sheet: {
    backgroundColor: colors.cardWhite,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    paddingHorizontal: spacing.screenPaddingH,
    paddingTop: spacing.sm,
    minHeight: 220,
    ...shadows.card,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.title,
    flex: 1,
  },
  closeButton: {
    width: CLOSE_ICON_SIZE + spacing.sm,
    height: CLOSE_ICON_SIZE + spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonPressed: {
    opacity: 0.7,
  },
});

export default InSessionSettingsModal;
