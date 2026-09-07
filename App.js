import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import Subidatest from './components/Subidatest';

export default function App() {
  return (
    <View style={styles.container}>
      <Subidatest />
      <Text>Open up App.js to start working on your app!</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fceeeeb3b',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
