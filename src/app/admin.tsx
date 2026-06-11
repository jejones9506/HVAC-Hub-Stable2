import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { useHVACStore } from '@/store/hvacStore';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';

export default function AdminPortal() {
  const { 
    isMasterAdmin, isLowerAdmin, adminCredentials, lowerAdmins, 
    updateAdminCredentials, assignLowerAdmin, removeLowerAdmin,
    user, terminology, diagrams 
  } = useHVACStore();

  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [assignEmail, setAssignEmail] = useState('');

  if (!isMasterAdmin() && !isLowerAdmin()) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">Access Denied</ThemedText>
        <ThemedText>Please log in as an admin to access this portal.</ThemedText>
      </ThemedView>
    );
  }

  const handleUpdateCredentials = () => {
    if (newEmail && newPassword) {
      updateAdminCredentials(newEmail, newPassword);
      Alert.alert('Success', 'Admin credentials updated. Please remember your new login details.');
      setNewEmail('');
      setNewPassword('');
    }
  };

  const handleAssign = () => {
    if (assignEmail) {
      assignLowerAdmin(assignEmail);
      Alert.alert('Assigned', `${assignEmail} has been assigned as Lower Admin. They will need to accept the Lower Admin TOS on next login.`);
      setAssignEmail('');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView>
        <ThemedText type="title" style={styles.title}>Admin Portal</ThemedText>
        
        {isMasterAdmin() && (
          <>
            <ThemedText type="subtitle">Master Admin Controls</ThemedText>
            
            <View style={styles.section}>
              <ThemedText>Current Master Login: {adminCredentials.email}</ThemedText>
              
              <ThemedText style={styles.label}>Change Admin Login</ThemedText>
              <TextInput 
                style={styles.input} 
                placeholder="New Email" 
                value={newEmail} 
                onChangeText={setNewEmail} 
                autoCapitalize="none"
              />
              <TextInput 
                style={styles.input} 
                placeholder="New Password" 
                value={newPassword} 
                onChangeText={setNewPassword} 
                secureTextEntry 
              />
              <Pressable style={styles.button} onPress={handleUpdateCredentials}>
                <ThemedText style={styles.buttonText}>Update Master Credentials</ThemedText>
              </Pressable>
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.label}>Assign Lower Admin</ThemedText>
              <TextInput 
                style={styles.input} 
                placeholder="User Email to Promote" 
                value={assignEmail} 
                onChangeText={setAssignEmail} 
                autoCapitalize="none"
              />
              <Pressable style={styles.button} onPress={handleAssign}>
                <ThemedText style={styles.buttonText}>Assign as Lower Admin</ThemedText>
              </Pressable>
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.label}>Current Lower Admins</ThemedText>
              {lowerAdmins.length === 0 ? (
                <ThemedText>No lower admins assigned yet.</ThemedText>
              ) : (
                lowerAdmins.map((email, index) => (
                  <View key={index} style={styles.adminRow}>
                    <ThemedText>{email}</ThemedText>
                    <Pressable onPress={() => removeLowerAdmin(email)}>
                      <ThemedText style={{ color: 'red' }}>Remove</ThemedText>
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {(isMasterAdmin() || isLowerAdmin()) && (
          <View style={styles.section}>
            <ThemedText type="subtitle">Content Moderation</ThemedText>
            <ThemedText>
              Use the existing Approvals queue (accessible from Profile or Equipment) to review user uploads and AI suggestions.
              {'\n\n'}As an admin you can approve or reject items and choose whether approved content appears on specific unit pages.
            </ThemedText>
          </View>
        )}

        <View style={styles.section}>
          <ThemedText type="subtitle">Quick Reference</ThemedText>
          <ThemedText>Terminology and Diagrams are available in the main app for all users.</ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { marginBottom: 20, textAlign: 'center' },
  section: { marginBottom: 24, padding: 12, backgroundColor: '#f8f8f8', borderRadius: 8 },
  label: { fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 6, marginBottom: 8 },
  button: { backgroundColor: '#208AEF', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: 'white', fontWeight: '600' },
  adminRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderColor: '#eee' },
});
