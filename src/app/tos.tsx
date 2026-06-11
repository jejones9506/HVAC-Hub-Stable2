import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useHVACStore } from '@/store/hvacStore';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useRouter } from 'expo-router';

export default function TOSScreen() {
  const { acceptGeneralTOS, hasAcceptedGeneralTOS, acceptLowerAdminTOS, hasAcceptedLowerAdminTOS, isMasterAdmin, isLowerAdmin, user } = useHVACStore();
  const router = useRouter();
  const [acceptedGeneral, setAcceptedGeneral] = useState(hasAcceptedGeneralTOS);
  const [acceptedLower, setAcceptedLower] = useState(hasAcceptedLowerAdminTOS);

  const isLowerAssignment = user?.role === 'lower-admin' && !hasAcceptedLowerAdminTOS;

  const generalTOS = `
**HVAC Hub Terms of Service**

Welcome to HVAC Hub. By using this app, you agree to these terms.

1. **Purpose**: This app is a learning and diagnostic tool for HVAC technicians. It is not a substitute for proper training, licensing, or professional judgment.

2. **User Responsibilities**: You are responsible for verifying all information before applying it in the field. Always follow manufacturer instructions, local codes, and safety standards (EPA, OSHA, NEC, etc.).

3. **Community Content**: User-submitted notes, photos, and data are moderated. Do not upload copyrighted material, false information, or anything that could harm others.

4. **Privacy**: We collect minimal data for functionality. Your uploads may be shared publicly within the app after admin approval.

5. **Safety First**: Never bypass safety devices or work on live equipment without proper lockout/tagout procedures.

6. **Liability**: HVAC Hub and its developers are not liable for any damages, injuries, or losses resulting from use of this app.

7. **Updates**: These terms may be updated. Continued use means acceptance of changes.

By checking the box below, you confirm you have read, understood, and agree to these Terms of Service and the Community Rules.
`;

  const communityRules = `
**HVAC Hub Community Rules**

To keep this a safe, supportive place for technicians of all experience levels:

1. Be respectful and professional. No harassment, bullying, or offensive language.

2. Share accurate information. If you're unsure, say so or ask for help.

3. Verify before sharing. Double-check specs, codes, and procedures against official sources.

4. Protect privacy. Never share customer names, addresses, or sensitive job details.

5. No spam or self-promotion. This is a learning community, not a sales platform.

6. Report issues. Use the "Report Inaccuracy" button for bad data.

7. Help others grow. Answer questions kindly and share what you've learned.

Violations may result in removal of content or loss of access. Master and Lower Admins moderate content to keep the app useful and safe for everyone.
`;

  const lowerAdminTOS = `
**Lower Admin Terms of Service (Additional)**

As a Lower Admin you have extra responsibilities:

- Review and approve/reject user-submitted notes, AI suggestions, and community uploads.
- Decide whether approved information should appear on specific equipment unit pages.
- Maintain accuracy and safety of the shared database.
- Do not approve content you have not personally verified against reliable sources.
- Report any suspicious or harmful submissions to the Master Admin immediately.

You agree to act in the best interest of the HVAC community and to uphold the highest standards of professionalism and safety.

Failure to follow these responsibilities may result in removal of Lower Admin privileges.
`;

  const handleAccept = () => {
    if (!acceptedGeneral) {
      acceptGeneralTOS();
      setAcceptedGeneral(true);
    }
    if (isLowerAssignment && !acceptedLower) {
      acceptLowerAdminTOS();
      setAcceptedLower(true);
    }
    router.back(); // or navigate to main app
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText type="title" style={styles.title}>HVAC Hub Terms of Service</ThemedText>

        <ThemedText style={styles.section}>{generalTOS}</ThemedText>

        <ThemedText type="subtitle" style={styles.subtitle}>Community Rules</ThemedText>
        <ThemedText style={styles.section}>{communityRules}</ThemedText>

        {isLowerAssignment && (
          <>
            <ThemedText type="subtitle" style={styles.subtitle}>Lower Admin Additional Terms</ThemedText>
            <ThemedText style={styles.section}>{lowerAdminTOS}</ThemedText>
          </>
        )}

        <View style={styles.checkboxRow}>
          <Pressable 
            style={[styles.checkbox, acceptedGeneral && styles.checked]} 
            onPress={() => setAcceptedGeneral(!acceptedGeneral)}
          />
          <ThemedText>I have read and agree to the Terms of Service and Community Rules</ThemedText>
        </View>

        {isLowerAssignment && (
          <View style={styles.checkboxRow}>
            <Pressable 
              style={[styles.checkbox, acceptedLower && styles.checked]} 
              onPress={() => setAcceptedLower(!acceptedLower)}
            />
            <ThemedText>I have read and agree to the Lower Admin Additional Terms</ThemedText>
          </View>
        )}

        <Pressable 
          style={[styles.button, (!acceptedGeneral || (isLowerAssignment && !acceptedLower)) && styles.buttonDisabled]} 
          onPress={handleAccept}
          disabled={!acceptedGeneral || (isLowerAssignment && !acceptedLower)}
        >
          <ThemedText style={styles.buttonText}>I Agree & Continue</ThemedText>
        </Pressable>

        <ThemedText style={styles.footer}>You can review these terms anytime in the Admin Portal or Profile.</ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  scroll: { paddingBottom: 100 },
  title: { fontSize: 22, marginBottom: 16, textAlign: 'center' },
  subtitle: { fontSize: 18, marginTop: 20, marginBottom: 8 },
  section: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  checkbox: { width: 24, height: 24, borderWidth: 2, borderColor: '#208AEF', marginRight: 10, borderRadius: 4 },
  checked: { backgroundColor: '#208AEF' },
  button: { backgroundColor: '#208AEF', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: 'white', fontWeight: '600', fontSize: 16 },
  footer: { fontSize: 12, opacity: 0.6, textAlign: 'center', marginTop: 20 },
});
