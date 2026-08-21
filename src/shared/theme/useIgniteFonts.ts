import {
  NunitoSans_400Regular,
  NunitoSans_500Medium,
  NunitoSans_700Bold,
  NunitoSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/nunito-sans';

/** Loads Ignite theme faces. Returns true when ready to render text. */
export function useIgniteFonts(): boolean {
  const [loaded] = useFonts({
    NunitoSans_400Regular,
    NunitoSans_500Medium,
    NunitoSans_700Bold,
    NunitoSans_800ExtraBold,
  });

  return loaded;
}
