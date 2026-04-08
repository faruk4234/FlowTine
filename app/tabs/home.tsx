import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useAppTheme } from '@/src/state/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAtomValue } from 'jotai';
import { isPremiumAtom } from '@/src/state/atoms';

export default function HomeScreen() {
  const theme = useAppTheme();
  // We automatically know if the user paid because it checks RevenueCat in `app/_layout.tsx`!
  const isPremium = useAtomValue(isPremiumAtom);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: theme.spacing.screenHorizontal, paddingTop: theme.spacing.xl, paddingBottom: 40 }}>
        
        {/* Header Block */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: theme.colors.text, fontSize: theme.typography.title.fontSize, fontWeight: theme.typography.title.fontWeight }]}>Projects</Text>
            <Text style={{ color: theme.colors.mutedText, fontSize: theme.typography.bodyMedium.fontSize, marginTop: 4 }}>
              {isPremium ? "✨ Premium Member" : "Free Plan"}
            </Text>
          </View>
          <TouchableOpacity style={[styles.avatarButton, { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.borderRadius.round }]}>
             <Ionicons name="person" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Global Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.borderRadius.md }]}>
          <Ionicons name="search" size={20} color={theme.colors.mutedText} />
          <TextInput 
            style={[styles.searchInput, { color: theme.colors.text }]} 
            placeholder="Search projects..." 
            placeholderTextColor={theme.colors.mutedText} 
          />
        </View>

        {/* Recent Projects List */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text, fontSize: theme.typography.heading.fontSize, fontWeight: theme.typography.heading.fontWeight }]}>Recent</Text>
        
        <View style={styles.projectsGrid}>
          {/* Dashboard Card 1 */}
          <TouchableOpacity style={[styles.projectCard, { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, borderColor: theme.colors.border, borderWidth: 1 }]}>
            <View style={[styles.cardIcon, { backgroundColor: theme.colors.primary + '20' }]}>
              <Ionicons name="cube" size={24} color={theme.colors.primary} />
            </View>
            <Text style={[styles.cardTitle, { color: theme.colors.text, fontSize: theme.typography.bodyLarge.fontSize, fontWeight: theme.typography.bodyLarge.fontWeight }]}>Auth Flow Design</Text>
            <Text style={[styles.cardSubtitle, { color: theme.colors.mutedText, fontSize: theme.typography.caption.fontSize }]}>Updated 2h ago</Text>
          </TouchableOpacity>

          {/* Dashboard Card 2 */}
          <TouchableOpacity style={[styles.projectCard, { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.borderRadius.lg, borderColor: theme.colors.border, borderWidth: 1 }]}>
            <View style={[styles.cardIcon, { backgroundColor: theme.colors.accent + '20' }]}>
              <Ionicons name="flash" size={24} color={theme.colors.accent} />
            </View>
            <Text style={[styles.cardTitle, { color: theme.colors.text, fontSize: theme.typography.bodyLarge.fontSize, fontWeight: theme.typography.bodyLarge.fontWeight }]}>Landing Page UI</Text>
            <Text style={[styles.cardSubtitle, { color: theme.colors.mutedText, fontSize: theme.typography.caption.fontSize }]}>Updated 1d ago</Text>
          </TouchableOpacity>
        </View>

        {/* Primary Action Button */}
        <TouchableOpacity style={[styles.ctaButton, { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, marginTop: theme.spacing.xl }]}>
            <Ionicons name="add" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={[styles.ctaText, { fontSize: theme.typography.bodyMedium.fontSize }]}>Create New Project</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: {},
  avatarButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, marginBottom: 32 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, height: 24, paddingVertical: 0 },
  sectionTitle: { marginBottom: 16 },
  projectsGrid: { gap: 16 },
  projectCard: { padding: 20 },
  cardIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  cardTitle: { marginBottom: 4 },
  cardSubtitle: {},
  ctaButton: { flexDirection: 'row', padding: 16, justifyContent: 'center', alignItems: 'center' },
  ctaText: { color: '#FFF', fontWeight: 'bold' }
});
