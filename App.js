import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { BEST_SCORE_KEY, IlicGame } from './gameLogic';

const BOARD_SIZE = 10;
const COMPLIMENTS = ['Yay!', 'Amazing!', 'Woohoo!', 'Saved!', 'I\'m free!'];
const MOVE_SOUND_URI =
  'data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTAAAAAAAP//AAD//wAA//8AAP//AAD//wAA';
const GAME_OVER_SOUND_URI =
  'data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTAAAAAA////AAAA////AAAA////AAAA';

function keyOf(row, col) {
  return `${row}:${col}`;
}

export default function App() {
  const game = useMemo(() => new IlicGame(BOARD_SIZE, 0), []);
  const [state, setState] = useState(game.getState());
  const [celebration, setCelebration] = useState(null);
  const celebrationAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      const stored = Number((await AsyncStorage.getItem(BEST_SCORE_KEY)) ?? 0);
      game.setBestScore(Number.isFinite(stored) && stored > 0 ? stored : 0);
      setState(game.getState());
    })();
  }, [game]);

  async function persistBestScore(nextState) {
    await AsyncStorage.setItem(BEST_SCORE_KEY, String(nextState.bestScore));
  }

  async function playSound(uri) {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri }, { volume: 0.25 });
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch {
      // keep game playable even if audio fails
    }
  }

  function showCelebration() {
    const text = COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)];
    setCelebration({ text });
    celebrationAnim.setValue(0);
    Animated.timing(celebrationAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start(() => setCelebration(null));
  }

  async function onCellPress(row, col) {
    if (!game.discover(row, col)) {
      return;
    }

    const nextState = game.getState();
    setState(nextState);

    showCelebration();
    playSound(MOVE_SOUND_URI);

    if (nextState.bestScore > state.bestScore) {
      await persistBestScore(nextState);
    }

    if (nextState.gameOver) {
      playSound(GAME_OVER_SOUND_URI);
    }
  }

  function onUndo() {
    if (game.undo()) {
      setState(game.getState());
    }
  }

  function onRestart() {
    Alert.alert('Restart game?', 'Current progress will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restart',
        style: 'destructive',
        onPress: () => {
          game.reset();
          setState(game.getState());
        },
      },
    ]);
  }

  const validSet = useMemo(
    () => new Set(state.validMoves.map(([row, col]) => keyOf(row, col))),
    [state.validMoves],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.app}>
        <Text style={styles.title}>Ilicgame</Text>

        <View style={styles.statsGrid}>
          <StatCard label="Move" value={state.moveNumber} />
          <StatCard label="Latest Gain" value={state.latestGain} />
          <StatCard label="Total Score" value={state.totalScore} />
          <StatCard label="Best Score" value={state.bestScore} />
        </View>

        <View style={styles.controlsRow}>
          <Pressable
            style={[styles.button, styles.undoButton, !state.canUndo && styles.disabledButton]}
            disabled={!state.canUndo || state.gameOver}
            onPress={onUndo}
          >
            <Text style={styles.buttonText}>Undo</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.restartButton]} onPress={onRestart}>
            <Text style={styles.buttonText}>Restart</Text>
          </Pressable>
        </View>

        <View style={styles.boardWrap}>
          <View style={styles.board}>
            {state.board.map((rowData, row) =>
              rowData.map((moveValue, col) => {
                const isTaken = moveValue > 0;
                const isValid = validSet.has(keyOf(row, col));
                return (
                  <Pressable
                    key={keyOf(row, col)}
                    style={[styles.cell, isTaken && styles.takenCell, isValid && styles.validCell]}
                    disabled={!isValid}
                    onPress={() => onCellPress(row, col)}
                  >
                    <Text style={styles.cellText}>{isTaken ? moveValue : isValid ? '•' : ''}</Text>
                  </Pressable>
                );
              }),
            )}
          </View>

          {celebration && (
            <Animated.View
              style={[
                styles.celebration,
                {
                  opacity: celebrationAnim,
                  transform: [
                    {
                      translateY: celebrationAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [16, -20],
                      }),
                    },
                    {
                      scale: celebrationAnim.interpolate({
                        inputRange: [0, 0.4, 1],
                        outputRange: [0.8, 1.2, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.celebrationEmoji}>😄</Text>
              <Text style={styles.celebrationText}>{celebration.text}</Text>
            </Animated.View>
          )}

          {state.gameOver && (
            <View style={styles.overlay}>
              <View style={styles.overlayCard}>
                <Text style={styles.overlayTitle}>Game Over</Text>
                <Text style={styles.overlayLine}>Final move: {state.moveNumber}</Text>
                <Text style={styles.overlayLine}>Final score: {state.totalScore}</Text>
                <Text style={styles.overlayLine}>Freed creatures: {state.freedCount}</Text>
                <Text style={styles.overlayLine}>Trapped creatures: {state.trappedCount}</Text>
                <Text style={styles.sadLine}>😢 😢 😢</Text>
                <Pressable
                  style={[styles.button, styles.playAgainButton]}
                  onPress={() => {
                    game.reset();
                    setState(game.getState());
                  }}
                >
                  <Text style={styles.buttonText}>Play Again</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function StatCard({ label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0f172a' },
  app: { flex: 1, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 12 },
  title: { color: '#e5e7eb', fontSize: 28, fontWeight: '700', marginBottom: 12 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#111827',
    borderColor: '#1f2937',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  statValue: { color: '#e5e7eb', fontWeight: '700', fontSize: 20 },
  controlsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  button: {
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  undoButton: { backgroundColor: '#1d4ed8' },
  restartButton: { backgroundColor: '#f97316' },
  playAgainButton: { marginTop: 10, backgroundColor: '#22c55e' },
  buttonText: { color: 'white', fontWeight: '700' },
  disabledButton: { opacity: 0.5 },
  boardWrap: {
    flex: 1,
    backgroundColor: '#0d1526',
    borderColor: '#1f2937',
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cell: {
    width: '9%',
    aspectRatio: 1,
    borderColor: '#263042',
    borderWidth: 2,
    backgroundColor: '#101827',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  validCell: { backgroundColor: '#0f2c66', borderColor: '#60a5fa' },
  takenCell: { backgroundColor: '#0b1020', borderColor: '#334155' },
  cellText: { color: '#e5e7eb', fontWeight: '700', fontSize: 12 },
  celebration: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '42%',
    alignItems: 'center',
  },
  celebrationEmoji: { fontSize: 34 },
  celebrationText: { marginTop: 4, color: '#fde68a', fontWeight: '700' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 7, 18, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  overlayCard: {
    width: '95%',
    maxWidth: 420,
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  overlayTitle: { color: '#e5e7eb', fontSize: 24, fontWeight: '700', marginBottom: 8 },
  overlayLine: { color: '#e5e7eb', marginVertical: 2 },
  sadLine: { marginTop: 10, fontSize: 20 },
});
