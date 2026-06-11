import React from 'react';
import { View, Image, ScrollView, StyleSheet } from 'react-native';
import { useHVACStore } from '@/store/hvacStore';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';

export default function DiagramsScreen() {
  const { diagrams } = useHVACStore();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Technical Diagrams</ThemedText>
      <ThemedText style={styles.intro}>
        Educational visuals for new and experienced technicians. Many include animated elements (flow arrows, rotating fans/motors, cycling valves) in the app to show how components actually move and interact during operation. Tap images for full view.
      </ThemedText>

      <ScrollView>
        {diagrams.map((diagram) => (
          <View key={diagram.id} style={styles.card}>
            <ThemedText type="subtitle">{diagram.title}</ThemedText>
            <ThemedText style={styles.description}>{diagram.description}</ThemedText>
            
            <Image 
              source={{ uri: diagram.imagePath }} 
              style={styles.image}
              resizeMode="contain"
            />
            
            <ThemedText style={styles.note}>
              Training Tip: Study the moving parts in operation. Red/orange = hot/high pressure. Blue = cool/low pressure. Always follow manufacturer flow directions.
            </ThemedText>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { marginBottom: 8 },
  intro: { marginBottom: 16, opacity: 0.8 },
  card: { marginBottom: 24, backgroundColor: '#fff', padding: 12, borderRadius: 10 },
  description: { marginBottom: 8, fontSize: 14 },
  image: { width: '100%', height: 220, backgroundColor: '#f0f0f0', borderRadius: 8, marginVertical: 8 },
  note: { fontSize: 12, fontStyle: 'italic', opacity: 0.7, marginTop: 4 },
});
