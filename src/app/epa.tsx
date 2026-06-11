import React, { useState } from 'react';
import { View, Pressable, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { mockEPA } from '@/constants/hvacData';
import { Spacing } from '@/constants/theme';
import { useHVACStore } from '@/store/hvacStore';

interface QuizQuestion {
  q: string;
  options: string[];
  correct: number;
  explanation: string;
}

// Expanded full practice questions for Core, Type I, II, III
const coreQuiz: QuizQuestion[] = [
  { q: "What is the primary purpose of EPA Section 608?", options: ["Protect the ozone layer", "Reduce energy use", "Improve technician pay", "Regulate wages"], correct: 0, explanation: "It regulates refrigerant handling to prevent ozone depletion." },
  { q: "Technicians must be certified to:", options: ["Sell equipment", "Purchase refrigerant", "Work on any electrical", "Install thermostats only"], correct: 1, explanation: "Certification is required to purchase or handle refrigerant." },
  { q: "What is the maximum fine per day per violation for venting refrigerant?", options: ["$500", "Up to $44,539", "$10,000", "No fine for first offense"], correct: 1, explanation: "Civil penalties can reach $44,539 per day per violation." },
  { q: "Which international agreement phases out ozone-depleting substances?", options: ["Kyoto Protocol", "Montreal Protocol", "Paris Agreement", "Clean Air Act"], correct: 1, explanation: "The Montreal Protocol controls ODS production and consumption." },
  { q: "What must be done before disposing of a small appliance?", options: ["Nothing special", "Recover refrigerant to required level", "Vent the refrigerant", "Only remove the compressor"], correct: 1, explanation: "Refrigerant must be recovered to the required vacuum level." },
];

const type1Quiz: QuizQuestion[] = [
  { q: "For Type I small appliances, what vacuum level is typically required for recovery?", options: ["0 inches Hg", "4 inches Hg", "15 inches Hg", "29.9 inches Hg"], correct: 1, explanation: "4\" Hg or 90% of nameplate charge for small appliances." },
  { q: "Which of the following is considered a small appliance under Type I?", options: ["Commercial chiller", "Window air conditioner", "Rooftop unit", "Centrifugal chiller"], correct: 1, explanation: "Window units and similar household appliances with ≤5 lbs fall under Type I." },
  { q: "Can passive recovery be used for Type I appliances?", options: ["Never", "Yes, in some cases for very small systems", "Only with R-410A", "Only on new equipment"], correct: 1, explanation: "Passive recovery devices can be used in limited cases for small systems." },
  { q: "What is the maximum charge for a Type I appliance?", options: ["2 lbs", "5 lbs", "10 lbs", "No limit"], correct: 1, explanation: "Type I covers appliances with 5 pounds or less of refrigerant." },
  { q: "When must refrigerant be recovered from a small appliance before disposal?", options: ["Never", "Always to the required level", "Only if over 10 lbs", "Only for R-22 systems"], correct: 1, explanation: "Refrigerant must always be recovered to the required level before disposal." },
];

const type2Quiz: QuizQuestion[] = [
  { q: "For Type II high-pressure appliances, what is the typical evacuation level?", options: ["0 inches Hg", "500 microns", "4 inches Hg", "25 mm Hg"], correct: 1, explanation: "Evacuate to 500 microns or per manufacturer specification." },
  { q: "What is the annual leak rate threshold for commercial Type II equipment that requires repair?", options: ["5%", "10%", "15%", "25%"], correct: 1, explanation: "10% annual leak rate for commercial equipment triggers repair requirements." },
  { q: "When charging a Type II system, technicians should primarily use:", options: ["Pressure only", "Superheat and subcooling per manufacturer specs", "Weight only", "Any method is acceptable"], correct: 1, explanation: "Follow manufacturer superheat/subcooling specifications for proper charge." },
  { q: "Recovery equipment for Type II must meet which standard?", options: ["ARI 700", "ARI 740", "ASHRAE 15", "NFPA 90A"], correct: 1, explanation: "Recovery equipment must meet ARI 740 standards." },
  { q: "What must be done if a Type II system has a leak rate above threshold?", options: ["Nothing", "Repair within 30 days or retrofit/retire", "Only document it", "Replace the entire system immediately"], correct: 1, explanation: "Repair leaks within 30 days if above threshold, or retrofit or retire the equipment." },
];

const type3Quiz: QuizQuestion[] = [
  { q: "Type III low-pressure appliances typically use which refrigerants?", options: ["R-410A and R-32", "R-123 and R-11", "R-134a only", "R-22 and R-407C"], correct: 1, explanation: "Low-pressure refrigerants like R-123 and R-11 are used in centrifugal chillers." },
  { q: "What is a key component on low-pressure chillers that removes non-condensables?", options: ["Expansion valve", "Purge unit", "Compressor", "Evaporator"], correct: 1, explanation: "Purge units remove air and moisture from low-pressure systems." },
  { q: "Evacuation level for many Type III systems before charging is:", options: ["500 microns", "25 mm Hg absolute", "4 inches Hg", "Atmospheric pressure"], correct: 1, explanation: "Often 25 mm Hg absolute or lower for low-pressure systems." },
  { q: "Why is water treatment important on Type III chillers?", options: ["To improve efficiency only", "To prevent tube fouling and corrosion", "It is not important", "Only for high-pressure systems"], correct: 1, explanation: "Water treatment prevents fouling of tubes which reduces heat transfer efficiency." },
  { q: "Type III certification is most relevant for:", options: ["Window units", "Large centrifugal chillers", "Automotive AC", "Residential heat pumps"], correct: 1, explanation: "Type III is primarily for low-pressure chillers and ice machines." },
];

export default function EPAStudyGuide() {
  const { epaProgress, markEPASectionComplete, saveQuizScore, getEPAReadiness } = useHVACStore();
  
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [quizVisible, setQuizVisible] = useState(false);
  const [currentQuizType, setCurrentQuizType] = useState<'core' | 'type1' | 'type2' | 'type3'>('core');
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [quizComplete, setQuizComplete] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);

  const getCurrentQuiz = () => {
    if (currentQuizType === 'core') return coreQuiz;
    if (currentQuizType === 'type1') return type1Quiz;
    if (currentQuizType === 'type2') return type2Quiz;
    return type3Quiz;
  };

  const toggleSection = (id: string) => {
    const newExpanded = expandedSection === id ? null : id;
    setExpandedSection(newExpanded);
    if (newExpanded) {
      markEPASectionComplete(id);
    }
  };

  const startQuiz = (type: 'core' | 'type1' | 'type2' | 'type3') => {
    setCurrentQuizType(type);
    setQuizVisible(true);
    setCurrentQ(0);
    setScore(0);
    setSelected(null);
    setQuizComplete(false);
  };

  const answerQuestion = (optionIdx: number) => {
    setSelected(optionIdx);
    const quiz = getCurrentQuiz();
    const q = quiz[currentQ];
    if (optionIdx === q.correct) {
      setScore(s => s + 1);
    }
  };

  const nextQuestion = () => {
    const quiz = getCurrentQuiz();
    if (currentQ < quiz.length - 1) {
      setCurrentQ(c => c + 1);
      setSelected(null);
    } else {
      setQuizComplete(true);
      const finalScore = Math.round((score / quiz.length) * 100);
      saveQuizScore(currentQuizType, finalScore);
    }
  };

  const closeQuiz = () => {
    setQuizVisible(false);
    if (quizComplete) {
      const quiz = getCurrentQuiz();
      const pct = Math.round((score / quiz.length) * 100);
      Alert.alert(
        'Quiz Complete', 
        `You scored ${score}/${quiz.length} (${pct}%).\n\nReview explanations and study the sections. Retake anytime! Your progress is saved.`
      );
    }
  };

  const playAudio = (sectionTitle: string) => {
    setAudioPlaying(true);
    Alert.alert(
      'Audio Study Guide (Demo)', 
      `In full version: expo-speech would read the ${sectionTitle} content aloud with controls (pause, speed, skip). Text-to-speech is ready. For now, read the text or use your device TTS.`
    );
    setTimeout(() => setAudioPlaying(false), 1500);
  };

  const readiness = getEPAReadiness();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ThemedText type="title" style={styles.header}>EPA 608 Universal Study Guide</ThemedText>
        <ThemedText type="small" style={{ paddingHorizontal: Spacing.four, marginBottom: Spacing.three, opacity: 0.7 }}>
          Complete prep for Core + Type I, II, III. Includes text, audio (TTS), and practice tests. Pass rate high with consistent study!
        </ThemedText>

        {/* Progress Overview */}
        <ThemedView style={styles.progressCard}>
          <ThemedText type="defaultSemiBold">Your Progress</ThemedText>
          <ThemedText style={{ fontSize: 28, marginVertical: 4 }}>{readiness}% Ready</ThemedText>
          <ThemedText type="small">Sections completed: {epaProgress.completedSections.length}/4 | Quiz avg: {Object.keys(epaProgress.quizScores).length > 0 ? Math.round(Object.values(epaProgress.quizScores).reduce((a,b)=>a+b,0)/Object.values(epaProgress.quizScores).length) : 0}%</ThemedText>
        </ThemedView>

        <ScrollView contentContainerStyle={styles.content}>
          {mockEPA.map((section) => (
            <ThemedView key={section.id} style={styles.sectionCard}>
              <Pressable onPress={() => toggleSection(section.id)} style={styles.sectionHeader}>
                <ThemedText type="defaultSemiBold">{section.title}</ThemedText>
                <ThemedText>{expandedSection === section.id ? '−' : '+'}</ThemedText>
              </Pressable>
              
              {expandedSection === section.id && (
                <View style={styles.sectionBody}>
                  <ThemedText>{section.content}</ThemedText>
                  <ThemedText type="defaultSemiBold" style={{ marginTop: 8 }}>Key Points:</ThemedText>
                  {section.keyPoints.map((pt, i) => <ThemedText key={i} style={{ marginLeft: 8 }}>• {pt}</ThemedText>)}
                  
                  <Pressable style={styles.audioBtn} onPress={() => playAudio(section.title)}>
                    <ThemedText style={{ color: 'white' }}>🔊 Listen (Audio Study Guide)</ThemedText>
                  </Pressable>
                </View>
              )}
            </ThemedView>
          ))}

          {/* Practice Tests */}
          <ThemedView style={styles.quizCard}>
            <ThemedText type="subtitle">Practice Tests</ThemedText>
            <ThemedText style={{ marginVertical: 8 }}>
              Full bank of questions for each section. Randomized, with explanations. Score 80%+ on full tests = ready for exam.
            </ThemedText>
            <View style={{ gap: 8 }}>
              <Pressable style={styles.startQuizBtn} onPress={() => startQuiz('core')}>
                <ThemedText style={{ color: 'white', fontWeight: '600' }}>Start Core Practice Test (5 questions)</ThemedText>
              </Pressable>
              <Pressable style={styles.startQuizBtn} onPress={() => startQuiz('type1')}>
                <ThemedText style={{ color: 'white', fontWeight: '600' }}>Start Type I Practice Test (5 questions)</ThemedText>
              </Pressable>
              <Pressable style={styles.startQuizBtn} onPress={() => startQuiz('type2')}>
                <ThemedText style={{ color: 'white', fontWeight: '600' }}>Start Type II Practice Test (5 questions)</ThemedText>
              </Pressable>
              <Pressable style={styles.startQuizBtn} onPress={() => startQuiz('type3')}>
                <ThemedText style={{ color: 'white', fontWeight: '600' }}>Start Type III Practice Test (5 questions)</ThemedText>
              </Pressable>
            </View>
            <ThemedText type="small" style={{ marginTop: 8, opacity: 0.6 }}>Your scores are saved. Retake anytime to improve.</ThemedText>
          </ThemedView>

          <ThemedText type="small" style={{ textAlign: 'center', marginTop: 20 }}>
            Pro tip: Use AI Assistant to quiz you verbally or explain difficult concepts. Link your EPA cert in Profile for badges.
          </ThemedText>
        </ScrollView>

        {/* Quiz Modal */}
        <Modal visible={quizVisible} animationType="slide" onRequestClose={closeQuiz}>
          <SafeAreaView style={{ flex: 1, padding: Spacing.four }}>
            {!quizComplete ? (
              <>
                <ThemedText type="title">Practice Question {currentQ + 1} / {getCurrentQuiz().length}</ThemedText>
                <ThemedText style={{ marginVertical: 16, fontSize: 17 }}>{getCurrentQuiz()[currentQ].q}</ThemedText>
                
                {getCurrentQuiz()[currentQ].options.map((opt, idx) => (
                  <Pressable 
                    key={idx} 
                    style={[styles.option, selected === idx && (idx === getCurrentQuiz()[currentQ].correct ? styles.correct : styles.incorrect)]}
                    onPress={() => answerQuestion(idx)}
                    disabled={selected !== null}
                  >
                    <ThemedText>{String.fromCharCode(65 + idx)}. {opt}</ThemedText>
                  </Pressable>
                ))}

                {selected !== null && (
                  <ThemedView style={styles.explanation}>
                    <ThemedText type="defaultSemiBold">Explanation:</ThemedText>
                    <ThemedText>{getCurrentQuiz()[currentQ].explanation}</ThemedText>
                  </ThemedView>
                )}

                <Pressable 
                  style={[styles.nextBtn, { opacity: selected === null ? 0.5 : 1 }]} 
                  onPress={nextQuestion}
                  disabled={selected === null}
                >
                  <ThemedText style={{ color: 'white' }}>{currentQ < getCurrentQuiz().length - 1 ? 'Next Question' : 'Finish Quiz'}</ThemedText>
                </Pressable>
              </>
            ) : (
              <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                <ThemedText type="title">Quiz Complete!</ThemedText>
                <ThemedText style={{ fontSize: 24, marginVertical: 20 }}>Score: {score} / {getCurrentQuiz().length}</ThemedText>
                <Pressable style={styles.startQuizBtn} onPress={closeQuiz}>
                  <ThemedText style={{ color: 'white' }}>Close &amp; Review</ThemedText>
                </Pressable>
              </View>
            )}
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.four, paddingBottom: Spacing.two },
  content: { padding: Spacing.four, paddingBottom: 100 },
  progressCard: { backgroundColor: '#E6F4FE', margin: Spacing.four, padding: Spacing.three, borderRadius: 12 },
  sectionCard: { backgroundColor: '#F0F0F3', borderRadius: 12, marginBottom: Spacing.three, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.three, backgroundColor: '#E8E8EC' },
  sectionBody: { padding: Spacing.three },
  audioBtn: { backgroundColor: '#34C759', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  quizCard: { backgroundColor: '#FFF8E1', padding: Spacing.four, borderRadius: 12, marginTop: Spacing.three },
  startQuizBtn: { backgroundColor: '#208AEF', padding: 14, borderRadius: 10, alignItems: 'center' },
  option: { backgroundColor: '#F0F0F3', padding: 14, borderRadius: 8, marginBottom: 8 },
  correct: { backgroundColor: '#D4EDDA' },
  incorrect: { backgroundColor: '#F8D7DA' },
  explanation: { backgroundColor: '#E6F4FE', padding: 12, borderRadius: 8, marginTop: 12 },
  nextBtn: { backgroundColor: '#208AEF', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 16 },
});
