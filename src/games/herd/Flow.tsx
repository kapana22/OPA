import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Colors, body, title as titleFont } from '../../theme/theme';
import { GlassCard, RulesSheet, ScreenHeader } from '../../ui/Cards';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Layout } from '../../ui/layout';
import { FitText } from '../../ui/FitText';
import { useObservable } from '../../core/observable';
import { GamePause } from '../../core/ticker';
import type { GameFlowProps } from '../registry';
import { HerdEngine } from './engine';
import { useDialog } from '../../ui/Dialog';
import { game } from '../catalog';

const textStyle = [body(15, '500'), { color: Colors.textPrimary }];

export function HerdFlow({ roster, onExit }: GameFlowProps) {
  const [engine] = useState(() => new HerdEngine([...roster.players]));
  useObservable(engine);
  useEffect(() => { if (engine.phase === 'setup' && engine.canPlay) engine.startGame(); }, [engine]);
  const dialog = useDialog();
  const [showRules, setShowRules] = useState(false);
  // თამაშის შუაში ერთი შეხება მთელ პარტიას აგდებდა — სხვა რეჟიმების მსგავსად ჯერ ვეკითხებით.
  const back = () => {
    if (engine.phase === 'setup') return onExit();
    GamePause.hold('exit-dialog');
    dialog({
      title: 'თამაშიდან გასვლა?',
      message: 'მიმდინარე კითხვა დაიხურება.',
      onClose: () => GamePause.release('exit-dialog'),
      actions: [
        { label: 'გაგრძელება' },
        { label: 'გასვლა', primary: true, destructive: true, onPress: onExit },
      ],
    });
  };
  return (
    <View style={{ flex: 1 }}>
      <RulesSheet visible={showRules} title="Herd Mentality" accent={Colors.phosphor} steps={game('herd')?.howTo ?? []} onClose={() => setShowRules(false)} />
      <View style={Layout.header}><ScreenHeader title="Herd Mentality"  onBack={back} onInfo={() => setShowRules(true)} /></View>
      <ScrollView contentContainerStyle={[Layout.scroll, { gap: 16, flexGrow: 1 }]}>
        {engine.phase === 'setup' ? <>
          <GlassCard>
            <Text style={[body(17, '700'), { color: Colors.phosphor }]}>პასუხები ხმამაღლა</Text>
            <Text style={textStyle}>მოიფიქრეთ პასუხი და სამზე ყველამ ერთად ხმამაღლა თქვით. შეადარეთ პასუხები და გადადით შემდეგ კითხვაზე.</Text>
          </GlassCard>
          {!engine.canPlay && <Text style={textStyle}>საჭიროა მინიმუმ 4 მოთამაშე.</Text>}
          <PrimaryButton title="დაწყება" enabled={engine.canPlay} onPress={() => engine.startGame()} />
        </> : null}
        {engine.phase === 'question' ? <Question engine={engine} onExit={onExit} /> : null}
      </ScrollView>
    </View>
  );
}
function Question({ engine, onExit }: { engine: HerdEngine; onExit: () => void }) {
  return <>
    <View style={{ flex: 1 }} />
    <GlassCard><FitText style={[titleFont(25), Layout.centered, { color: Colors.textPrimary }]} maxLines={8}>{engine.question}</FitText></GlassCard>
    <Text style={[body(15, '600'), Layout.centered, { color: Colors.phosphor }]}>სამზე ერთად თქვით პასუხი</Text>
    <View style={{ flex: 1 }} />
    <PrimaryButton title="შემდეგი კითხვა" onPress={() => engine.next()} />
    <GhostButton title="დასრულება" onPress={onExit} />
  </>;
}
