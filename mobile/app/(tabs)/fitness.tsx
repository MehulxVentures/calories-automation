import { View, Text, StyleSheet } from "react-native";

export default function FitnessScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Fitness</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#101010",
  },
  text: {
    color: "#fff",
    fontSize: 18,
  },
});
