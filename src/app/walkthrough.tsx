import React, { useState } from 'react';
import { View, TextInput, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useHVACStore } from '@/store/hvacStore';
import { Spacing } from '@/constants/theme';
import { mockEquipment } from '@/constants/hvacData';

const JOB_TYPES = ['Install New', 'Repair', 'Diagnostic', 'Replace', 'Maintenance'] as const;
const UNIT_TYPES = ['Air Conditioner', 'Heat Pump', 'Furnace', 'RTU', 'Mini-Split', 'Chiller'] as const;

export default function WalkthroughScreen() {
  const router = useRouter();
  const { 
    currentLocation, 
    getLocalCodes, 
    user, 
    equipment, 
    saveWalkthrough, 
    walkthroughHistory 
  } = useHVACStore();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    jobType: '' as typeof JOB_TYPES[number] | '',
    unitType: '' as typeof UNIT_TYPES[number] | '',
    brand: '',
    model: '',
    serial: '',
    electrical: '',
    refrigerant: '',
    capacity: '',
    location: currentLocation,
    materials: '',
    symptoms: '',
    notes: '',
  });
  const [generated, setGenerated] = useState<any>(null);

  const localCodes = getLocalCodes();

  const updateForm = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const nextStep = () => {
    if (step < 5) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const generateWalkthrough = () => {
    const matchedEquipment = equipment.find(e => 
      e.brand.toLowerCase() === form.brand.toLowerCase() && 
      e.model.toLowerCase() === form.model.toLowerCase()
    ) || mockEquipment[0]; // fallback

    const isRepairOrDiag = form.jobType === 'Repair' || form.jobType === 'Diagnostic';

    const ppe = [
      'Safety glasses',
      'Chemical-resistant gloves',
      form.refrigerant.includes('R-410') || form.refrigerant.includes('R-32') ? 'A2L refrigerant gloves' : 'Standard gloves',
      'Steel-toe boots',
      form.electrical.includes('480') || form.electrical.includes('high') ? 'Arc flash PPE (Class 2 minimum)' : 'Insulated gloves',
      'Hard hat (if overhead work)',
    ];

    const tools = [
      'Manifold gauge set (compatible with refrigerant)',
      'Recovery machine + recovery cylinder',
      'Vacuum pump (5 CFM minimum)',
      'Digital multimeter',
      'Clamp meter',
      'Leak detector (electronic + soap)',
      'Thermometer / psychrometer',
      'Tube cutter, deburring tool, flaring tool',
      'Brazing torch + nitrogen regulator',
      'Lockout/tagout kit',
    ];

    const materials = [
      `${form.refrigerant || 'R-410A'} refrigerant (estimated 2-8 lbs)`,
      'Copper line set (match existing size)',
      'Filter drier (bi-flow if heat pump)',
      'Electrical wire (match MCA/MOP from unit)',
      'Conduit and fittings as needed',
      'Thermostat wire (18/8 or better)',
      form.jobType === 'Install New' ? 'Condensate pump + drain line' : 'N/A',
    ];

    const steps = [
      `1. Safety first: Lockout/tagout electrical disconnect. Verify zero energy state. Wear required PPE: ${ppe.slice(0,3).join(', ')}.`,
      `2. Gather tools and materials listed above. Confirm you have the correct refrigerant and recovery equipment.`,
      `3. Assess the job site per local codes: ${localCodes.join(' ')}. Check for proper access, ventilation, and clearance.`,
      `4. If model matches database (${matchedEquipment.brand} ${matchedEquipment.model}): Follow manufacturer submittal for wiring, charging, and testing procedures.`,
      `5. ${form.jobType === 'Install New' ? 'Mount equipment per manufacturer instructions and local codes. Install line set, drain, and electrical.' : 'Recover refrigerant to required level (500 microns for Type II). Document recovered amount.'}`,
      `6. Perform leak check with nitrogen (150-300 psi depending on system). Repair any leaks.`,
      `7. Evacuate system to 500 microns (or per manufacturer). Hold for 10+ minutes.`,
      `8. Charge by weight or superheat/subcooling method. Use manifold gauges and follow unit specs.`,
      `9. Test operation: Check voltages, amps, pressures, temperatures, and airflow. Verify thermostat function.`,
      `10. Complete documentation: Record refrigerant used/recovered, test results, and any code compliance notes. Clean up site.`,
    ];

    if (isRepairOrDiag && form.symptoms) {
      steps.splice(4, 0, `4.5 Diagnostic step: Based on symptoms "${form.symptoms}", check common issues for this model (e.g., low charge, bad capacitor, TXV). Use AI chat for model-specific troubleshooting if needed.`);
    }

    const codeNotes = [
      ...localCodes,
      'Follow manufacturer installation instructions (always supersede general codes).',
      'NEC 440 for air conditioning equipment (overcurrent protection, disconnects).',
      'NFPA 90A/B for duct systems and smoke/fire dampers if applicable.',
      'ASHRAE 15 for refrigerant safety and machinery room requirements.',
      form.location.startsWith('9') ? 'California Title 24 energy code may apply for efficiency and controls.' : '',
    ].filter(Boolean);

    const diagnosticTips = isRepairOrDiag ? [
      'Check for low/high pressure trips first.',
      'Verify airflow before blaming refrigerant charge.',
      'Use model-specific error codes if available.',
      'Inspect electrical connections and capacitors on startup issues.',
    ] : undefined;

    const result = {
      jobType: form.jobType,
      unitDetails: `${form.unitType} ${form.brand} ${form.model} (${form.capacity})`,
      location: form.location,
      generated: {
        ppe,
        tools,
        materials,
        steps,
        codeNotes,
        diagnosticTips,
      },
    };

    setGenerated(result);
    setStep(6); // Show results
  };

  const saveToHistory = () => {
    if (!generated) return;
    saveWalkthrough({
      jobType: form.jobType,
      unitDetails: `${form.unitType} ${form.brand} ${form.model}`,
      location: form.location,
      generated: generated.generated,
    });
    Alert.alert('Saved', 'Walkthrough saved to your history. View in Profile or AI chat for reference.');
  };

  const reset = () => {
    setStep(1);
    setForm({
      jobType: '', unitType: '', brand: '', model: '', serial: '',
      electrical: '', refrigerant: '', capacity: '', location: currentLocation,
      materials: '', symptoms: '', notes: '',
    });
    setGenerated(null);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ThemedText type="title" style={styles.header}>Job Assistant &amp; Walkthrough Generator</ThemedText>
        <ThemedText type="small" style={{ paddingHorizontal: Spacing.four, marginBottom: Spacing.two, opacity: 0.7 }}>
          Provide job details below. Generates code-compliant steps, PPE, tools, and materials lists based on your location and equipment data.
        </ThemedText>

        <ScrollView contentContainerStyle={styles.content}>
          {step <= 5 && (
            <>
              {/* Step indicators */}
              <ThemedText style={{ textAlign: 'center', marginBottom: 12 }}>Step {step} of 5</ThemedText>

              {step === 1 && (
                <ThemedView style={styles.formSection}>
                  <ThemedText type="defaultSemiBold">1. Job Type</ThemedText>
                  {JOB_TYPES.map(type => (
                    <Pressable key={type} style={[styles.option, form.jobType === type && styles.optionSelected]} onPress={() => updateForm('jobType', type)}>
                      <ThemedText>{type}</ThemedText>
                    </Pressable>
                  ))}
                </ThemedView>
              )}

              {step === 2 && (
                <ThemedView style={styles.formSection}>
                  <ThemedText type="defaultSemiBold">2. Unit Details</ThemedText>
                  <ThemedText>Unit Type:</ThemedText>
                  {UNIT_TYPES.map(t => (
                    <Pressable key={t} style={[styles.option, form.unitType === t && styles.optionSelected]} onPress={() => updateForm('unitType', t)}>
                      <ThemedText>{t}</ThemedText>
                    </Pressable>
                  ))}
                  <TextInput style={styles.input} placeholder="Brand (e.g. Carrier)" value={form.brand} onChangeText={v => updateForm('brand', v)} />
                  <TextInput style={styles.input} placeholder="Model (e.g. 24ANB1-036)" value={form.model} onChangeText={v => updateForm('model', v)} />
                  <TextInput style={styles.input} placeholder="Serial (optional)" value={form.serial} onChangeText={v => updateForm('serial', v)} />
                  <TextInput style={styles.input} placeholder="Electrical (e.g. 208/230V 15A)" value={form.electrical} onChangeText={v => updateForm('electrical', v)} />
                  <TextInput style={styles.input} placeholder="Refrigerant (e.g. R-410A)" value={form.refrigerant} onChangeText={v => updateForm('refrigerant', v)} />
                  <TextInput style={styles.input} placeholder="Capacity (e.g. 3 Ton)" value={form.capacity} onChangeText={v => updateForm('capacity', v)} />
                </ThemedView>
              )}

              {step === 3 && (
                <ThemedView style={styles.formSection}>
                  <ThemedText type="defaultSemiBold">3. Location &amp; Site Info</ThemedText>
                  <TextInput style={styles.input} placeholder="ZIP Code (auto from profile)" value={form.location} onChangeText={v => updateForm('location', v)} />
                  <ThemedText type="small" style={{ marginTop: 8 }}>Local codes applied: {localCodes.join(' | ')}</ThemedText>
                  <TextInput style={styles.input} placeholder="Materials being used (e.g. new copper line set)" value={form.materials} onChangeText={v => updateForm('materials', v)} />
                </ThemedView>
              )}

              {step === 4 && (
                <ThemedView style={styles.formSection}>
                  <ThemedText type="defaultSemiBold">4. Symptoms / Additional Details (for Repair/Diag)</ThemedText>
                  <TextInput style={[styles.input, { height: 80 }]} multiline placeholder="Describe symptoms or job specifics..." value={form.symptoms} onChangeText={v => updateForm('symptoms', v)} />
                  <TextInput style={[styles.input, { height: 60 }]} multiline placeholder="Additional notes (e.g. access issues)" value={form.notes} onChangeText={v => updateForm('notes', v)} />
                </ThemedView>
              )}

              {step === 5 && (
                <ThemedView style={styles.formSection}>
                  <ThemedText type="defaultSemiBold">5. Review &amp; Generate</ThemedText>
                  <ThemedText>Job: {form.jobType} {form.unitType}</ThemedText>
                  <ThemedText>Unit: {form.brand} {form.model}</ThemedText>
                  <ThemedText>Location: {form.location}</ThemedText>
                  <Pressable style={styles.generateBtn} onPress={generateWalkthrough}>
                    <ThemedText style={{ color: 'white', fontWeight: '600' }}>Generate Walkthrough</ThemedText>
                  </Pressable>
                  <ThemedText type="small" style={{ marginTop: 8 }}>This will create PPE, tools, materials, step-by-step procedures, and code notes tailored to your inputs and local regulations.</ThemedText>
                </ThemedView>
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                {step > 1 && <Pressable style={styles.navBtn} onPress={prevStep}><ThemedText>Back</ThemedText></Pressable>}
                {step < 5 && <Pressable style={styles.navBtn} onPress={nextStep}><ThemedText>Next</ThemedText></Pressable>}
              </View>
            </>
          )}

          {step === 6 && generated && (
            <ThemedView style={styles.results}>
              <ThemedText type="title">Generated Walkthrough</ThemedText>
              <ThemedText type="small" style={{ marginBottom: 12 }}>{generated.jobType} for {generated.unitDetails} in {generated.location}</ThemedText>

              <ThemedView style={styles.resultSection}>
                <ThemedText type="defaultSemiBold">Required PPE</ThemedText>
                {generated.generated.ppe.map((item: string, i: number) => <ThemedText key={i}>• {item}</ThemedText>)}
              </ThemedView>

              <ThemedView style={styles.resultSection}>
                <ThemedText type="defaultSemiBold">Tools Needed</ThemedText>
                {generated.generated.tools.map((item: string, i: number) => <ThemedText key={i}>• {item}</ThemedText>)}
              </ThemedView>

              <ThemedView style={styles.resultSection}>
                <ThemedText type="defaultSemiBold">Materials &amp; Parts (est. prices in Equipment Hub)</ThemedText>
                {generated.generated.materials.map((item: string, i: number) => <ThemedText key={i}>• {item}</ThemedText>)}
              </ThemedView>

              <ThemedView style={styles.resultSection}>
                <ThemedText type="defaultSemiBold">Step-by-Step Procedure</ThemedText>
                {generated.generated.steps.map((step: string, i: number) => <ThemedText key={i} style={{ marginBottom: 6 }}>{step}</ThemedText>)}
              </ThemedView>

              <ThemedView style={styles.resultSection}>
                <ThemedText type="defaultSemiBold">Local Code &amp; Compliance Notes</ThemedText>
                {generated.generated.codeNotes.map((note: string, i: number) => <ThemedText key={i}>• {note}</ThemedText>)}
              </ThemedView>

              {generated.generated.diagnosticTips && (
                <ThemedView style={styles.resultSection}>
                  <ThemedText type="defaultSemiBold">Diagnostic Tips</ThemedText>
                  {generated.generated.diagnosticTips.map((tip: string, i: number) => <ThemedText key={i}>• {tip}</ThemedText>)}
                </ThemedView>
              )}

              <Pressable style={styles.saveBtn} onPress={saveToHistory}>
                <ThemedText style={{ color: 'white' }}>Save to My History</ThemedText>
              </Pressable>
              <Pressable style={styles.resetBtn} onPress={reset}>
                <ThemedText>Start New Walkthrough</ThemedText>
              </Pressable>
              <Pressable style={styles.aiBtn} onPress={() => router.push('/ai')}>
                <ThemedText>Ask AI for more details on this job</ThemedText>
              </Pressable>
            </ThemedView>
          )}

          {walkthroughHistory.length > 0 && step === 1 && (
            <ThemedView style={{ marginTop: 20 }}>
              <ThemedText type="subtitle">Recent Saved Walkthroughs</ThemedText>
              {walkthroughHistory.slice(0, 3).map((w, i) => (
                <ThemedText key={i} type="small" style={{ marginTop: 4 }}>• {w.jobType} {w.unitDetails} ({w.location})</ThemedText>
              ))}
            </ThemedView>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.four, paddingBottom: Spacing.two },
  content: { padding: Spacing.four, paddingBottom: 120 },
  formSection: { marginBottom: Spacing.four },
  option: { padding: 12, backgroundColor: '#F0F0F3', borderRadius: 8, marginBottom: 6 },
  optionSelected: { backgroundColor: '#208AEF' },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginTop: 8 },
  navBtn: { padding: 12, backgroundColor: '#E8E8EC', borderRadius: 8, minWidth: 80, alignItems: 'center' },
  generateBtn: { backgroundColor: '#208AEF', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  results: { paddingBottom: 40 },
  resultSection: { backgroundColor: '#F0F0F3', padding: Spacing.three, borderRadius: 10, marginBottom: Spacing.three },
  saveBtn: { backgroundColor: '#34C759', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  resetBtn: { padding: 12, alignItems: 'center', marginTop: 8 },
  aiBtn: { backgroundColor: '#E6F4FE', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
});
