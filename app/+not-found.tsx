import { Stack } from 'expo-router';
import * as Linking from 'expo-linking';
import { StyleSheet, Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen name="not-found" options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.text}>This screen doesn't exist.</Text>
        <Text 
          style={styles.link} 
          onPress={() => Linking.openURL('/')}>
          Go to home screen!
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  text: {
    fontSize: 20,
    fontWeight: 600,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
