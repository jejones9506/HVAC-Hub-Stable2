import React, { useState } from 'react';
import { View, TextInput, FlatList, StyleSheet } from 'react-native';
import { useHVACStore } from '@/store/hvacStore';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';

export default function TerminologyScreen() {
  const { terminology } = useHVACStore();
  const [search, setSearch] = useState('');

  const filtered = terminology.filter(item =>
    item.term.toLowerCase().includes(search.toLowerCase()) ||
    item.definition.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>HVAC Terminology</ThemedText>
      <TextInput
        style={styles.search}
        placeholder="Search terms (e.g. superheat, subcool, SEER)..."
        value={search}
        onChangeText={setSearch}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <ThemedText type="defaultSemiBold" style={styles.term}>{item.term}</ThemedText>
            <ThemedText style={styles.definition}>{item.definition}</ThemedText>
          </View>
        )}
        ListEmptyComponent={<ThemedText>No matching terms found.</ThemedText>}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { marginBottom: 12 },
  search: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 8, marginBottom: 16 },
  card: { backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8, marginBottom: 10 },
  term: { fontSize: 16, marginBottom: 4 },
  definition: { fontSize: 14, lineHeight: 20 },
});
