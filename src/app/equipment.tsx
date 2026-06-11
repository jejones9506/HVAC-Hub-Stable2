import React, { useState } from 'react';
import { 
  View, TextInput, FlatList, Pressable, StyleSheet, Modal, ScrollView, 
  Alert, Platform, Image, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import * as ImagePicker from 'expo-image-picker';
import { Camera, CameraView } from 'expo-camera';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useHVACStore } from '@/store/hvacStore';
import { mockBrands, mockRefrigerants, mockSDS, mockMaterials, Equipment } from '@/constants/hvacData';
import { Spacing } from '@/constants/theme';

export default function EquipmentHub() {
  const { 
    equipment, communityPosts, setSelectedEquipment, selectedEquipment, 
    showModal, setShowModal, addCommunityPost, user, isLoggedIn,
    favorites, toggleFavorite, addApproval,
    // Step 17
    performWebSearch, recordAPICall, supabaseStatus,
    // New visual search
    visualSearchCaptures, addVisualCapture, clearVisualCaptures, visualSearchResults, performVisualSearch
  } = useHVACStore();
  
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'brand' | 'type' | 'refrig' | 'sds' | 'materials' | 'notes'>('all');
  const [filterBrand, setFilterBrand] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterRefrig, setFilterRefrig] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [isPublicNote, setIsPublicNote] = useState(true);
  const [detailTab, setDetailTab] = useState<'overview' | 'electrical' | 'specs' | 'parts' | 'community'>('overview');
  const [selectedRefrigerant, setSelectedRefrigerant] = useState<any>(null);
  const [ptLookupPressure, setPtLookupPressure] = useState('');
  const [ptLookupTemp, setPtLookupTemp] = useState('');
  const [uploadType, setUploadType] = useState<'note' | 'photo' | 'video'>('note');
  const [uploadUri, setUploadUri] = useState<string | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  // New: Visual Search with camera (multiple photos + video) + fuzzy matching
  const [showVisualSearchModal, setShowVisualSearchModal] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false); // Step 16 perf

  const filteredEquipment = equipment.filter(eq => {
    const matchesSearch = 
      eq.brand.toLowerCase().includes(search.toLowerCase()) || 
      eq.model.toLowerCase().includes(search.toLowerCase()) ||
      eq.type.toLowerCase().includes(search.toLowerCase()) ||
      eq.refrigerant.toLowerCase().includes(search.toLowerCase());
    
    const matchesBrand = !filterBrand || eq.brand === filterBrand;
    const matchesType = !filterType || eq.type === filterType;
    const matchesRefrig = !filterRefrig || eq.refrigerant === filterRefrig;
    
    return matchesSearch && matchesBrand && matchesType && matchesRefrig;
  });

  const filteredPosts = communityPosts.filter(p => 
    p.model.toLowerCase().includes(search.toLowerCase()) && p.isPublic
  );

  const categories = [
    { id: 'all', label: 'All Equipment' },
    { id: 'brand', label: 'By Brand' },
    { id: 'type', label: 'By Type' },
    { id: 'refrig', label: 'Refrigerants' },
    { id: 'sds', label: 'Safety Data Sheets' },
    { id: 'materials', label: 'Materials (Wire/Pipe)' },
    { id: 'notes', label: 'Community Notes' },
  ] as const;

  const types = Array.from(new Set(equipment.map(e => e.type)));
  const refrigerants = Array.from(new Set(equipment.map(e => e.refrigerant)));

  const openDetail = (eq: Equipment) => {
    setSelectedEquipment(eq);
    setDetailTab('overview');
    setShowModal('equipment-detail');
    setNewNote('');
  };

  const handleAddNote = () => {
    if (!selectedEquipment || (!newNote.trim() && !uploadUri) || !isLoggedIn) {
      Alert.alert('Upload', 'Please enter content or select a photo/video, and sign in.');
      return;
    }

    const postType: 'note' | 'photo' | 'video' | 'tip' = uploadUri ? (uploadType === 'photo' ? 'photo' : 'video') : 'note';
    const content = newNote.trim() || `${uploadType} uploaded for ${selectedEquipment.model}`;

    const upload = {
      model: selectedEquipment.model,
      type: postType,
      content,
      uri: uploadUri || undefined,
      isPublic: isPublicNote,
    };

    // Add to user uploads (for profile and community)
    useHVACStore.getState().addUserUpload(upload);

    // Also add to communityPosts for immediate visibility in notes section
    const post = {
      id: 'post' + Date.now(),
      user: user?.name || 'You',
      model: selectedEquipment.model,
      type: postType,
      content,
      isPublic: isPublicNote,
      timestamp: new Date().toISOString().split('T')[0],
    };
    addCommunityPost(post);

    setNewNote('');
    setUploadUri(null);
    setUploadType('note');
    Alert.alert('Success', `${postType.charAt(0).toUpperCase() + postType.slice(1)} added (${isPublicNote ? 'public' : 'private'}). Thanks for contributing!`);
  };

  const pickMedia = async (mediaType: 'photo' | 'video') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: mediaType === 'photo' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setUploadUri(result.assets[0].uri);
      setUploadType(mediaType);
      setNewNote(`Uploaded ${mediaType} for this unit.`);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setUploadUri(result.assets[0].uri);
      setUploadType('photo');
      setNewNote('Photo taken for this unit.');
    }
  };

  // Step 15: QR Scanner using expo-camera
  const openQRScanner = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasCameraPermission(status === 'granted');
    if (status !== 'granted') {
      Alert.alert('Camera Permission', 'Camera access is required to scan QR codes on equipment.');
      return;
    }
    setShowQRScanner(true);
  };

  // New feature: Camera Visual Search - multiple photos or continuous video for partial nameplates
  const takePhotoForSearch = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.65,
    });
    if (!result.canceled && result.assets?.[0]) {
      addVisualCapture('photo', result.assets[0].uri);
    }
  };

  const recordVideoForSearch = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 15,
    });
    if (!result.canceled && result.assets?.[0]) {
      addVisualCapture('video', result.assets[0].uri);
    }
  };

  const runVisualSearchMatch = () => {
    const hints = prompt('Enter any legible parts from the nameplate (e.g. "XR 48 208 R-4" or brand hints):') || '';
    performVisualSearch(hints);
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setShowQRScanner(false);
    const matched = useHVACStore.getState().scanQRForEquipment(data);
    if (matched) {
      Alert.alert('QR Scanned!', `Matched: ${matched.brand} ${matched.model}. Opening detail view.`, [
        { text: 'OK', onPress: () => openDetail(matched) }
      ]);
    } else {
      Alert.alert('QR Scanned', `Data: ${data}. No exact match in DB, but logged in scan history (Profile). Try a model like "24ANB1-036".`);
    }
  };

  // Step 18: Report Inaccuracy for community moderation (creates approval for admin review)
  // Uses simple flow (no native prompt for cross-platform compatibility); in real would use a TextInput modal.
  const handleReportInaccuracy = (eq: Equipment | null) => {
    if (!eq || !isLoggedIn || !user) {
      Alert.alert('Sign in required', 'Please sign in to report inaccuracies.');
      return;
    }
    const defaultReport = `Inaccuracy noted for ${eq.brand} ${eq.model}: e.g. SEER or price appears outdated based on recent field data / manufacturer update. Please verify against latest submittal.`;
    Alert.alert(
      'Report Inaccuracy',
      `Submit a report for ${eq.brand} ${eq.model}?\n\n${defaultReport}\n\n(Admins will review and may update the shared record. You can add more detail in future versions.)`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit Report',
          onPress: () => {
            const reportApproval = {
              id: 'rep' + Date.now(),
              suggestedBy: user.name,
              suggestedById: user.id,
              dataType: 'Report' as const,
              summary: `Inaccuracy report for ${eq.brand} ${eq.model}`,
              details: defaultReport,
              suggestedData: {
                equipmentId: eq.id,
                currentData: { seer: eq.capacities.seer, price: eq.averagePrice, specs: eq.specs.substring(0, 100) },
                userNotes: defaultReport,
                brand: eq.brand,
                model: eq.model,
              },
              timestamp: new Date().toISOString(),
              status: 'pending' as const,
            };
            addApproval(reportApproval);
            recordAPICall('sds', 0);
            Alert.alert('Report Submitted', 'Thank you! This inaccuracy report has been sent to admins for moderation and will appear in the approvals queue (under Reports). This helps keep the shared database accurate for the community.');
          }
        }
      ]
    );
  };

  // AI-assisted SDS search (Step 8 + Step 17 hardened: tries real Edge web search first, full prior sim fallback)
  const simulateAISDSSearch = async (chemical: string) => {
    recordAPICall('sds', 0.002);
    let searchResult = '';
    let usedReal = false;

    try {
      const { results, usedReal: realFlag } = await performWebSearch(`SDS safety data sheet for ${chemical} HVAC refrigerant`, 'sds');
      searchResult = results;
      usedReal = realFlag;
    } catch {
      // full fallback to prior simulation (preserve functionality)
      searchResult = `AI Web Search for SDS: ${chemical}\n\nHazards: Asphyxiant in high conc., frostbite risk, eye/skin irritant.\nHandling: Ventilate area, use in well-ventilated space, avoid direct contact.\nPPE: Safety glasses, chemical resistant gloves, long sleeves. Respirator if high exposure.\nFirst Aid: Move to fresh air, flush eyes/skin with water 15+ min.\n\nSource: Simulated from OSHA/manufacturer SDS (2026 data).`;
    }

    if (usedReal) {
      searchResult += `\n\n[✅ Real SDS search via Supabase Edge Function]`;
    } else {
      searchResult += `\n\n[⚠️ Simulation mode] Is this correct? Submit for admin approval to add to shared SDS database (dupe check applied).`;
    }
    
    Alert.alert(
      `SDS Results for ${chemical}`,
      searchResult,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Verify & Submit for Approval', 
          onPress: () => {
            if (!isLoggedIn) {
              Alert.alert('Sign in required', 'Please sign in to contribute SDS data.');
              return;
            }
            const newApproval = {
              id: 'ap' + Date.now(),
              suggestedBy: user?.name || 'User',
              dataType: 'SDS' as const,
              summary: `New SDS for ${chemical} via AI search`,
              details: searchResult,
              suggestedData: { chemical, hazards: 'Asphyxiant...', handling: '...', ppe: '...' }, // for future structured insert
              status: 'pending' as const,
              timestamp: new Date().toISOString(),
            };
            addApproval(newApproval);
            Alert.alert('Submitted', 'SDS info sent to admins for review. Will be added to shared DB if approved (no duplicates).');
          }
        }
      ]
    );
  };

  const renderEquipmentCard = ({ item }: { item: Equipment }) => {
    const isFav = favorites.includes(item.id);
    return (
      <Pressable 
        style={styles.card} 
        onPress={() => openDetail(item)}
        accessibilityLabel={`${item.brand} ${item.model}, ${item.type}, ${item.averagePrice}`}
        accessibilityHint="Tap to view full details, electrical, parts, and community notes"
        accessibilityRole="button"
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <ThemedText type="defaultSemiBold" style={styles.cardTitle}>{item.brand} {item.model}</ThemedText>
          <Pressable 
            onPress={(e) => { e.stopPropagation(); toggleFavorite(item.id); }} 
            style={{ padding: 4 }}
            accessibilityLabel={isFav ? "Remove from favorites" : "Add to favorites"}
          >
            <SymbolView name={isFav ? "heart.fill" : "heart"} size={20} tintColor={isFav ? "#E74C3C" : "#888"} />
          </Pressable>
        </View>
        <ThemedText type="small">{item.type} • {item.refrigerant} • {item.capacities.tonnage}</ThemedText>
        <ThemedText type="small" style={styles.price}>{item.averagePrice} avg (as of {item.lastUpdated}) • Tap for full specs, submittals, parts</ThemedText>
        <ThemedText type="small" style={{ color: '#34C759' }}>✓ Verified in DB • {item.materialsCompat ? item.materialsCompat.length + ' compat materials' : ''}</ThemedText>
      </Pressable>
    );
  };

  const clearFilters = () => {
    setFilterBrand(null);
    setFilterType(null);
    setFilterRefrig(null);
    setSearch('');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ThemedText type="title" style={styles.header}>Equipment &amp; Materials Hub</ThemedText>
          <ThemedText type="small" style={{ paddingHorizontal: Spacing.four, opacity: 0.7 }}>
            Organized by brand, model, electrical, capacities, refrigerants &amp; more. All users share verified data.
            <Pressable onPress={async () => {
              setIsLoadingList(true);
              useHVACStore.getState().refreshEquipmentPrices();
              await new Promise(r => setTimeout(r, 300)); // perf loading demo
              setIsLoadingList(false);
            }} style={{ marginLeft: 8 }}>
              <ThemedText style={{ color: '#208AEF' }}>(Refresh Prices)</ThemedText>
            </Pressable>
            <Pressable onPress={openQRScanner} style={{ marginLeft: 12 }}>
              <ThemedText style={{ color: '#34C759' }}>📷 Scan QR</ThemedText>
            </Pressable>

            {/* New feature: Camera Visual Search for partial/illegible nameplates */}
            <Pressable 
              onPress={() => setShowVisualSearchModal(true)} 
              style={{ marginLeft: 12 }}
            >
              <ThemedText style={{ color: '#FF9500' }}>📸 Visual Search</ThemedText>
            </Pressable>
            <Pressable onPress={() => {
              Alert.alert('Diagnostic Wizard (Step 15)', 'Step 1: What is the main symptom?', [
                { text: 'No Cooling', onPress: () => Alert.alert('Step 2: Check airflow?', '', [{ text: 'Low', onPress: () => Alert.alert('Likely: Dirty filter or fan issue. Check capacitors. Log job?') }]) },
                { text: 'No Heat', onPress: () => Alert.alert('Possible reversing valve or heat strips. Check voltage.') },
                { text: 'Strange Noise', onPress: () => Alert.alert('Common: Bad capacitor, loose panel, or compressor. Inspect visually.') },
              ]);
              useHVACStore.getState().awardBadge('First Diagnostic');
            }} style={{ marginLeft: 8 }}>
              <ThemedText style={{ color: '#F9A825' }}>🔧 Diagnose</ThemedText>
            </Pressable>
          </ThemedText>
          {isLoadingList && <ActivityIndicator style={{ margin: Spacing.two }} />}
        
        {/* Search */}
        <View style={styles.searchContainer}>
          <SymbolView name="magnifyingglass" size={18} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search brand, model, type, refrigerant..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#888"
          />
          {(search || filterBrand || filterType || filterRefrig) && (
            <Pressable onPress={clearFilters}><ThemedText style={{ color: '#208AEF' }}>Clear</ThemedText></Pressable>
          )}
        </View>

        {/* Active Filters */}
        {(filterBrand || filterType || filterRefrig) && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.four, gap: 6, marginBottom: 6 }}>
            {filterBrand && <ThemedText style={styles.filterTag}>Brand: {filterBrand} ×</ThemedText>}
            {filterType && <ThemedText style={styles.filterTag}>Type: {filterType} ×</ThemedText>}
            {filterRefrig && <ThemedText style={styles.filterTag}>Refrig: {filterRefrig} ×</ThemedText>}
          </View>
        )}

        {/* Category Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          {categories.map(cat => (
            <Pressable 
              key={cat.id} 
              style={[styles.catChip, activeCategory === cat.id && styles.catChipActive]}
              onPress={() => setActiveCategory(cat.id)}
            >
              <ThemedText style={[styles.catText, activeCategory === cat.id && styles.catTextActive]}>
                {cat.label}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        {/* Content based on category */}
        {(activeCategory === 'all' || activeCategory === 'brand' || activeCategory === 'type') && (
          <>
            {/* Quick Filters */}
            <ScrollView horizontal style={{ paddingHorizontal: Spacing.four, marginBottom: 8 }} showsHorizontalScrollIndicator={false}>
              {mockBrands.slice(0, 6).map(brand => (
                <Pressable key={brand} onPress={() => setFilterBrand(filterBrand === brand ? null : brand)} style={[styles.filterChip, filterBrand === brand && styles.filterChipActive]}>
                  <ThemedText style={{ fontSize: 12 }}>{brand}</ThemedText>
                </Pressable>
              ))}
              {types.map(t => (
                <Pressable key={t} onPress={() => setFilterType(filterType === t ? null : t)} style={[styles.filterChip, filterType === t && styles.filterChipActive]}>
                  <ThemedText style={{ fontSize: 12 }}>{t}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>
            <FlatList
              data={filteredEquipment}
              renderItem={renderEquipmentCard}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={<ThemedText style={styles.empty}>No equipment found. Adjust filters or search.</ThemedText>}
            />
          </>
        )}

        {activeCategory === 'refrig' && (
          <ScrollView style={styles.listContent}>
            <ThemedText type="subtitle" style={{ marginBottom: 12 }}>Common Refrigerants (Interactive PT Charts)</ThemedText>
            <ThemedText type="small" style={{ marginBottom: 12 }}>Tap a refrigerant for full PT table + lookup. Full charts also in Calculators. AI can fetch latest manufacturer data.</ThemedText>
            {mockRefrigerants.map((r, i) => (
              <ThemedView key={i} style={styles.infoCard}>
                <Pressable onPress={() => {
                  setSelectedRefrigerant(r);
                  setShowModal('refrig-pt');
                }}>
                  <ThemedText type="defaultSemiBold">{r.name}</ThemedText>
                  <ThemedText type="small">Composition: {r.composition}</ThemedText>
                  <ThemedText type="small">GWP: {r.gwp} | Typical: {r.typicalUse}</ThemedText>
                  <ThemedText type="small" style={{ color: '#208AEF' }}>Tap for interactive PT chart &amp; lookup →</ThemedText>
                </Pressable>
              </ThemedView>
            ))}
          </ScrollView>
        )}

        {activeCategory === 'sds' && (
          <ScrollView style={styles.listContent}>
            <ThemedText type="subtitle" style={{ marginBottom: 12 }}>Safety Data Sheets (SDS)</ThemedText>
            <ThemedText type="small" style={{ marginBottom: 8 }}>
              AI-assisted: Search web for any chemical/product. Verify → Submit for admin approval (no duplicates).
            </ThemedText>
            <Pressable 
              style={[styles.uploadBtn, { marginBottom: 16 }]} 
              onPress={() => {
                Alert.prompt 
                  ? Alert.prompt('AI SDS Search', 'Enter chemical name (e.g. R-32 or Brazing Flux):', (text) => {
                      if (text) simulateAISDSSearch(text);
                    })
                  : Alert.alert('AI SDS Search', 'Enter chemical in AI chat for now (e.g. "search SDS for R-32"). Full form in production.');
              }}
            >
              <ThemedText style={{ color: 'white' }}>🔍 AI Search Web for New SDS</ThemedText>
            </Pressable>
            {mockSDS.map((sds, i) => (
              <ThemedView key={i} style={styles.infoCard}>
                <ThemedText type="defaultSemiBold">{sds.chemical}</ThemedText>
                <ThemedText type="small">Hazards: {sds.hazards}</ThemedText>
                <ThemedText type="small">Handling: {sds.handling}</ThemedText>
                <ThemedText type="small">PPE Required: {sds.ppe}</ThemedText>
                <ThemedText type="small" style={{ color: '#208AEF' }}>Source: {sds.source}</ThemedText>
              </ThemedView>
            ))}
          </ScrollView>
        )}

        {activeCategory === 'materials' && (
          <ScrollView style={styles.listContent}>
            <ThemedText type="subtitle" style={{ marginBottom: 12 }}>Materials (Wire, Pipe, Tube, Fittings)</ThemedText>
            <ThemedText type="small" style={{ marginBottom: 12 }}>Organized for easy lookup during installs. Prices real-time estimates.</ThemedText>
            {mockMaterials.map((mat, i) => (
              <ThemedView key={i} style={styles.infoCard}>
                <ThemedText type="defaultSemiBold">{mat.name} ({mat.type})</ThemedText>
                <ThemedText type="small">{mat.specs}</ThemedText>
                <ThemedText type="small" style={{ color: '#34C759' }}>{mat.averagePrice} avg</ThemedText>
                {mat.buyLinks.map((l, idx) => <ThemedText key={idx} style={{ color: '#208AEF', fontSize: 13 }}>{l.vendor}: {l.price}</ThemedText>)}
              </ThemedView>
            ))}
          </ScrollView>
        )}

        {activeCategory === 'notes' && (
          <ScrollView style={styles.listContent}>
            <ThemedText type="subtitle" style={{ marginBottom: 8 }}>Public Community Notes (by model)</ThemedText>
            <ThemedText type="small" style={{ marginBottom: 12, opacity: 0.7 }}>
              Upload your own in equipment detail view. Private uploads visible only to you in Profile.
            </ThemedText>
            {filteredPosts.length > 0 ? filteredPosts.map(post => (
              <ThemedView key={post.id} style={styles.postCard}>
                <ThemedText type="defaultSemiBold">{post.model} • by {post.user}</ThemedText>
                <ThemedText type="small">{post.content}</ThemedText>
                <ThemedText type="small" style={{ opacity: 0.5 }}>{post.timestamp}</ThemedText>
              </ThemedView>
            )) : <ThemedText>No public notes match your search yet. Contribute some!</ThemedText>}
          </ScrollView>
        )}

        {/* PT Chart Modal (new for Step 8) */}
        <Modal
          visible={showModal === 'refrig-pt' && !!selectedRefrigerant}
          animationType="slide"
          onRequestClose={() => { setShowModal(null); setSelectedRefrigerant(null); setPtLookupPressure(''); setPtLookupTemp(''); }}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
            <ScrollView contentContainerStyle={{ padding: Spacing.four }}>
              {selectedRefrigerant && (
                <>
                  <Pressable onPress={() => { setShowModal(null); setSelectedRefrigerant(null); }} style={{ alignSelf: 'flex-end' }}>
                    <ThemedText style={{ color: '#208AEF' }}>Close ✕</ThemedText>
                  </Pressable>
                  <ThemedText type="title">{selectedRefrigerant.name} PT Chart</ThemedText>
                  <ThemedText type="small">{selectedRefrigerant.ptNotes}</ThemedText>

                  {/* Interactive Lookup */}
                  <ThemedView style={[styles.detailSection, { marginTop: 16 }]}>
                    <ThemedText type="defaultSemiBold">Lookup (enter one, get the other)</ThemedText>
                    <TextInput 
                      style={styles.noteInput} 
                      placeholder="Enter Pressure (psig)" 
                      keyboardType="numeric" 
                      value={ptLookupPressure} 
                      onChangeText={(v) => {
                        setPtLookupPressure(v);
                        if (v) {
                          const p = parseFloat(v);
                          const match = selectedRefrigerant.ptChart.find((pt: any) => Math.abs(pt.pressurePsig - p) < 10);
                          setPtLookupTemp(match ? match.tempF.toString() : 'Approx. ' + (p / 3.5).toFixed(0));
                        }
                      }} 
                    />
                    <ThemedText style={{ marginVertical: 4 }}>or</ThemedText>
                    <TextInput 
                      style={styles.noteInput} 
                      placeholder="Enter Temp (°F)" 
                      keyboardType="numeric" 
                      value={ptLookupTemp} 
                      onChangeText={(v) => {
                        setPtLookupTemp(v);
                        if (v) {
                          const t = parseFloat(v);
                          const match = selectedRefrigerant.ptChart.find((pt: any) => Math.abs(pt.tempF - t) < 5);
                          setPtLookupPressure(match ? match.pressurePsig.toString() : 'Approx. ' + (t * 3.5).toFixed(0));
                        }
                      }} 
                    />
                    <ThemedText type="small" style={{ marginTop: 8 }}>Results update live. Use with gauges for superheat/subcool. Cross-reference manufacturer charts.</ThemedText>
                  </ThemedView>

                  {/* PT Table */}
                  <ThemedText type="defaultSemiBold" style={{ marginTop: 16 }}>Sample PT Table</ThemedText>
                  {selectedRefrigerant.ptChart.map((pt: any, idx: number) => (
                    <ThemedView key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderColor: '#eee' }}>
                      <ThemedText>{pt.tempF}°F</ThemedText>
                      <ThemedText>{pt.pressurePsig} psig</ThemedText>
                    </ThemedView>
                  ))}
                </>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* Step 15: QR Scanner Modal */}
        <Modal
          visible={showQRScanner}
          animationType="slide"
          onRequestClose={() => setShowQRScanner(false)}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
            <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <ThemedText style={{ color: 'white' }}>Scan QR Code on Equipment Label</ThemedText>
              <Pressable onPress={() => setShowQRScanner(false)}><ThemedText style={{ color: '#208AEF' }}>Cancel</ThemedText></Pressable>
            </View>
            {hasCameraPermission === false ? (
              <ThemedText style={{ color: 'white', textAlign: 'center', marginTop: 40 }}>No access to camera. Enable in settings.</ThemedText>
            ) : (
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                onBarcodeScanned={handleBarCodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
              />
            )}
            <ThemedText style={{ color: 'white', textAlign: 'center', padding: 16, opacity: 0.7 }}>Point camera at QR label. Scanned data will lookup model in DB.</ThemedText>
          </SafeAreaView>
        </Modal>

        {/* New: Visual Search Modal - Multiple photos or continuous video + fuzzy match for partial nameplates */}
        <Modal
          visible={showVisualSearchModal}
          animationType="slide"
          onRequestClose={() => {
            setShowVisualSearchModal(false);
            clearVisualCaptures();
          }}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
            <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#208AEF' }}>
              <ThemedText style={{ color: 'white', fontSize: 18, fontWeight: '600' }}>Camera Visual Search</ThemedText>
              <Pressable onPress={() => { setShowVisualSearchModal(false); clearVisualCaptures(); }}>
                <ThemedText style={{ color: 'white' }}>Close</ThemedText>
              </Pressable>
            </View>

            <ScrollView style={{ padding: 16 }}>
              <ThemedText type="subtitle">Capture Evidence from Nameplate</ThemedText>
              <ThemedText type="small" style={{ marginBottom: 12, opacity: 0.7 }}>
                Take several clear photos or record a short continuous video of the nameplate/serial plate. Then provide any legible fragments you see. We'll fuzzy-match against the database for best possible candidates.
              </ThemedText>

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                <Pressable style={[styles.uploadBtn, { backgroundColor: '#34C759', flex: 1 }]} onPress={takePhotoForSearch}>
                  <ThemedText style={{ color: 'white' }}>📷 Take Photo</ThemedText>
                </Pressable>
                <Pressable style={[styles.uploadBtn, { backgroundColor: '#FF9500', flex: 1 }]} onPress={recordVideoForSearch}>
                  <ThemedText style={{ color: 'white' }}>🎥 Record Video (15s max)</ThemedText>
                </Pressable>
              </View>

              <ThemedText>Captured: {visualSearchCaptures.photos.length} photos {visualSearchCaptures.videoUri ? '+ video' : ''}</ThemedText>

              {visualSearchCaptures.photos.length > 0 && (
                <ThemedText type="small" style={{ marginTop: 8 }}>Photos ready for analysis.</ThemedText>
              )}
              {visualSearchCaptures.videoUri && (
                <ThemedText type="small" style={{ marginTop: 4 }}>Video clip captured.</ThemedText>
              )}

              <Pressable 
                style={[styles.uploadBtn, { backgroundColor: '#6C63FF', marginTop: 16 }]} 
                onPress={runVisualSearchMatch}
              >
                <ThemedText style={{ color: 'white' }}>🔍 Analyze & Find Matches</ThemedText>
              </Pressable>

              {visualSearchResults.length > 0 && (
                <View style={{ marginTop: 20 }}>
                  <ThemedText type="subtitle">Potential Matches ({visualSearchResults.length})</ThemedText>
                  <ThemedText type="small" style={{ marginBottom: 8 }}>Based on visual evidence + your hints. Tap one to view full details.</ThemedText>
                  {visualSearchResults.map((result, index) => (
                    <Pressable 
                      key={index} 
                      style={styles.card} 
                      onPress={() => {
                        setSelectedEquipment(result.equipment);
                        setShowVisualSearchModal(false);
                        clearVisualCaptures();
                      }}
                    >
                      <ThemedText style={{ fontWeight: '600' }}>{result.equipment.brand} {result.equipment.model}</ThemedText>
                      <ThemedText type="small" style={{ color: '#34C759' }}>Confidence: {result.confidence}% — {result.reason}</ThemedText>
                      <ThemedText type="small" style={{ opacity: 0.7 }}>{result.equipment.specs.substring(0, 80)}...</ThemedText>
                    </Pressable>
                  ))}
                </View>
              )}

              <ThemedText type="small" style={{ marginTop: 24, opacity: 0.6, textAlign: 'center' }}>
                This uses camera + fuzzy matching on partial data. For best results, capture clear close-ups of any visible text/numbers.
              </ThemedText>
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* Equipment Detail Modal - Richer with Tabs */}
        <Modal
          visible={showModal === 'equipment-detail' && !!selectedEquipment}
          animationType="slide"
          onRequestClose={() => setShowModal(null)}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
            <ScrollView contentContainerStyle={{ padding: Spacing.four, paddingBottom: 80 }}>
              {selectedEquipment && (
                <>
                  <Pressable onPress={() => setShowModal(null)} style={{ alignSelf: 'flex-end', padding: 8 }}>
                    <ThemedText style={{ color: '#208AEF' }}>Close ✕</ThemedText>
                  </Pressable>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ThemedText type="title">{selectedEquipment.brand} {selectedEquipment.model}</ThemedText>
                    <Pressable onPress={() => toggleFavorite(selectedEquipment.id)}>
                      <SymbolView name={favorites.includes(selectedEquipment.id) ? "heart.fill" : "heart"} size={26} tintColor={favorites.includes(selectedEquipment.id) ? "#E74C3C" : "#888"} />
                    </Pressable>
                  </View>
                  <ThemedText type="subtitle">{selectedEquipment.type} • {selectedEquipment.refrigerant} • {selectedEquipment.capacities.tonnage}</ThemedText>

                  {/* Tab Navigation */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 12 }}>
                    {(['overview', 'electrical', 'specs', 'parts', 'community'] as const).map(tab => (
                      <Pressable key={tab} onPress={() => setDetailTab(tab)} style={[styles.tab, detailTab === tab && styles.tabActive]}>
                        <ThemedText style={{ fontSize: 13, textTransform: 'capitalize' }}>{tab}</ThemedText>
                      </Pressable>
                    ))}
                  </View>

                  {/* Tab Content */}
                  {detailTab === 'overview' && (
                    <ThemedView style={styles.detailSection}>
                      <ThemedText type="defaultSemiBold">Overview &amp; Key Specs</ThemedText>
                      <ThemedText>{selectedEquipment.specs}</ThemedText>
                      {selectedEquipment.notes && <ThemedText style={{ marginTop: 8 }}>{selectedEquipment.notes}</ThemedText>}
                      {selectedEquipment.materialsCompat && (
                        <ThemedText style={{ marginTop: 8 }}>Compatible Materials: {selectedEquipment.materialsCompat.join(', ')}</ThemedText>
                      )}
                      <ThemedText type="small" style={{ marginTop: 8, color: '#34C759' }}>Avg Price: {selectedEquipment.averagePrice}</ThemedText>
                    </ThemedView>
                  )}

                  {detailTab === 'electrical' && (
                    <ThemedView style={styles.detailSection}>
                      <ThemedText type="defaultSemiBold">Electrical Data</ThemedText>
                      <ThemedText>Voltage: {selectedEquipment.electrical.voltage}</ThemedText>
                      <ThemedText>Amps: {selectedEquipment.electrical.amps} | Phase: {selectedEquipment.electrical.phase}</ThemedText>
                      {selectedEquipment.electrical.mca && <ThemedText>MCA: {selectedEquipment.electrical.mca} | MOP: {selectedEquipment.electrical.mop}</ThemedText>}
                      {selectedEquipment.electrical.fla && <ThemedText>FLA: {selectedEquipment.electrical.fla}</ThemedText>}
                      <ThemedText type="small" style={{ marginTop: 8 }}>Use Calculators tab for voltage drop / wire sizing based on this data + your location.</ThemedText>
                    </ThemedView>
                  )}

                  {detailTab === 'specs' && (
                    <ThemedView style={styles.detailSection}>
                      <ThemedText type="defaultSemiBold">Capacities &amp; Performance</ThemedText>
                      <ThemedText>Tonnage: {selectedEquipment.capacities.tonnage}</ThemedText>
                      {selectedEquipment.capacities.cooling && <ThemedText>Cooling: {selectedEquipment.capacities.cooling}</ThemedText>}
                      {selectedEquipment.capacities.heating && <ThemedText>Heating: {selectedEquipment.capacities.heating}</ThemedText>}
                      {selectedEquipment.capacities.seer && <ThemedText>SEER: {selectedEquipment.capacities.seer}</ThemedText>}
                      {selectedEquipment.capacities.afue && <ThemedText>AFUE: {selectedEquipment.capacities.afue}</ThemedText>}
                      <ThemedText type="small" style={{ marginTop: 8 }}>Refrigerant: {selectedEquipment.refrigerant}</ThemedText>
                    </ThemedView>
                  )}

                  {detailTab === 'parts' && (
                    <ThemedView style={styles.detailSection}>
                      <ThemedText type="defaultSemiBold">Parts List &amp; Pricing (Main unit avg: {selectedEquipment.averagePrice} as of {selectedEquipment.lastUpdated})</ThemedText>
                      {selectedEquipment.partsList && selectedEquipment.partsList.length > 0 ? (
                        selectedEquipment.partsList.map((p, i) => (
                          <ThemedText key={i} style={{ marginVertical: 2 }}>• {p.part}: {p.description} — {p.price}</ThemedText>
                        ))
                      ) : <ThemedText type="small">Common parts available in full DB. AI can fetch specific submittals.</ThemedText>}
                      <ThemedText type="small" style={{ marginTop: 12 }}>Buy links: {selectedEquipment.buyLinks.map(l => l.vendor + ' ' + l.price).join(' | ')}</ThemedText>
                    </ThemedView>
                  )}

                  {detailTab === 'community' && (
                    <ThemedView style={styles.detailSection}>
                      <ThemedText type="defaultSemiBold">Community Notes for this Model</ThemedText>
                      {communityPosts.filter(p => p.model === selectedEquipment.model && p.isPublic).length > 0 ? 
                        communityPosts.filter(p => p.model === selectedEquipment.model && p.isPublic).map(p => (
                          <ThemedText key={p.id} type="small" style={{ marginVertical: 4 }}>• {p.content} (by {p.user})</ThemedText>
                        )) : <ThemedText type="small">No public notes yet for this model.</ThemedText>
                      }
                      {/* Upload Note / Media */}
                      <ThemedView style={{ backgroundColor: '#F0F8FF', padding: Spacing.three, borderRadius: 10, marginTop: 12 }}>
                        <ThemedText type="defaultSemiBold">Share Your Knowledge (Upload)</ThemedText>
                        <ThemedText type="small">Add a note, tip, photo or video about this unit. Can be public or private.</ThemedText>

                        <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8, flexWrap: 'wrap' }}>
                          <Pressable style={[styles.filterChip, uploadType === 'note' && styles.filterChipActive]} onPress={() => setUploadType('note')}>
                            <ThemedText style={{ fontSize: 12 }}>Note</ThemedText>
                          </Pressable>
                          <Pressable style={[styles.filterChip, uploadType === 'photo' && styles.filterChipActive]} onPress={() => pickMedia('photo')}>
                            <ThemedText style={{ fontSize: 12 }}>Photo</ThemedText>
                          </Pressable>
                          <Pressable style={[styles.filterChip, uploadType === 'video' && styles.filterChipActive]} onPress={() => pickMedia('video')}>
                            <ThemedText style={{ fontSize: 12 }}>Video</ThemedText>
                          </Pressable>
                          <Pressable style={styles.filterChip} onPress={takePhoto}>
                            <ThemedText style={{ fontSize: 12 }}>📷 Camera</ThemedText>
                          </Pressable>
                        </View>

                        {uploadUri && (
                          <View style={{ marginVertical: 8, alignItems: 'center' }}>
                            <Image source={{ uri: uploadUri }} style={{ width: 100, height: 100, borderRadius: 8 }} />
                            <ThemedText type="small" style={{ marginTop: 4 }}>Selected {uploadType}</ThemedText>
                            <Pressable onPress={() => setUploadUri(null)}><ThemedText style={{ color: '#E74C3C' }}>Remove</ThemedText></Pressable>
                          </View>
                        )}

                        <TextInput
                          style={styles.noteInput}
                          placeholder={uploadUri ? "Add a caption or description..." : "E.g., Common failure point on this model is the contactor..."}
                          value={newNote}
                          onChangeText={setNewNote}
                          multiline
                        />
                        <Pressable style={{ flexDirection: 'row', gap: 8, marginVertical: 6 }} onPress={() => setIsPublicNote(!isPublicNote)}>
                          <ThemedText>Visibility: {isPublicNote ? 'PUBLIC (visible to all)' : 'PRIVATE (only in your Profile)'}</ThemedText>
                        </Pressable>
                        <Pressable style={styles.uploadBtn} onPress={handleAddNote}>
                          <ThemedText style={{ color: 'white' }}>Upload &amp; Share</ThemedText>
                        </Pressable>
                        <ThemedText type="small" style={{ opacity: 0.6, marginTop: 4 }}>Your uploads appear under Community Notes for this model if public.</ThemedText>
                      </ThemedView>
                    </ThemedView>
                  )}

                  <ThemedText type="small" style={{ textAlign: 'center', marginTop: 20, opacity: 0.5 }}>
                    All verified info shared with the HVAC community. Add your notes to help others!
                  </ThemedText>

                  {/* Step 18: Report Inaccuracy for community moderation (submits to approvals queue) */}
                  <Pressable 
                    style={[styles.uploadBtn, { backgroundColor: '#FF9500', marginTop: 16 }]} 
                    onPress={() => handleReportInaccuracy(selectedEquipment)}
                  >
                    <ThemedText style={{ color: 'white' }}>⚠️ Report Inaccuracy / Suggest Correction</ThemedText>
                  </Pressable>
                  <ThemedText type="small" style={{ textAlign: 'center', marginTop: 4, opacity: 0.6 }}>
                    Helps admins moderate &amp; improve shared data. Goes to approval queue.
                  </ThemedText>

                  {/* Step 20: AR stub (uses existing camera for simulated overlay) */}
                  <Pressable 
                    style={[styles.uploadBtn, { backgroundColor: '#6C63FF', marginTop: 8 }]} 
                    onPress={() => {
                      if (selectedEquipment) {
                        useHVACStore.getState().arOverlay(selectedEquipment.model);
                        Alert.alert('AR Overlay (Step 20 future)', `Simulated AR wiring diagram for ${selectedEquipment.brand} ${selectedEquipment.model}. In production: camera view with 3D overlay from manufacturer data.`);
                      }
                    }}
                  >
                    <ThemedText style={{ color: 'white' }}>📱 AR Wiring Diagram Overlay (future)</ThemedText>
                  </Pressable>
                </>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.four, paddingTop: Spacing.four, paddingBottom: Spacing.two },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F0F3', margin: Spacing.four, paddingHorizontal: Spacing.three, borderRadius: 10, height: 44 },
  searchInput: { flex: 1, fontSize: 16, color: '#000' },
  catScroll: { paddingHorizontal: Spacing.four, marginBottom: Spacing.two },
  catChip: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#F0F0F3', borderRadius: 20, marginRight: 8 },
  catChipActive: { backgroundColor: '#208AEF' },
  catText: { fontSize: 13 },
  catTextActive: { color: 'white', fontWeight: '600' },
  filterChip: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#E8E8EC', borderRadius: 12, marginRight: 6 },
  filterChipActive: { backgroundColor: '#208AEF' },
  filterTag: { backgroundColor: '#E6F4FE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontSize: 12 },
  listContent: { paddingHorizontal: Spacing.four, paddingBottom: 120 },
  card: { backgroundColor: '#F8F9FA', padding: Spacing.three, borderRadius: 12, marginBottom: Spacing.two, borderLeftWidth: 4, borderLeftColor: '#208AEF' },
  cardTitle: { fontSize: 15, flex: 1 },
  price: { color: '#34C759', marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 40, opacity: 0.6 },
  infoCard: { backgroundColor: '#F0F0F3', padding: Spacing.three, borderRadius: 10, marginBottom: Spacing.two },
  postCard: { backgroundColor: '#F8F9FA', padding: Spacing.three, borderRadius: 8, marginBottom: Spacing.two },
  detailSection: { marginTop: Spacing.four, backgroundColor: '#F8F9FA', padding: Spacing.three, borderRadius: 10 },
  noteInput: { backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, minHeight: 80, marginVertical: 8, textAlignVertical: 'top' },
  uploadBtn: { backgroundColor: '#208AEF', padding: 12, borderRadius: 8, alignItems: 'center' },
  tab: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F0F0F3', borderRadius: 16 },
  tabActive: { backgroundColor: '#208AEF' },
});
