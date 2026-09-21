import React, { useEffect, useRef, useState } from 'react';
import { AppState, ScrollView, Text, View } from 'react-native';
import { Colors, body, title } from '../../theme/theme';
import { GameExitButton, GlassCard, RulesSheet, ScreenHeader } from '../../ui/Cards';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Pressable } from '../../ui/Pressable';
import { PlayerCharacter } from '../../ui/PlayerCharacter';
import { PlayerAvatarView } from '../../ui/PlayerAvatarView';
import { Confetti } from '../../ui/Confetti';
import { Layout } from '../../ui/layout';
import { useObservable } from '../../core/observable';
import { useAwardOnce } from '../../core/awardOnce';
import { Haptics } from '../../core/haptics';
import { Sound } from '../../core/sound';
import { game } from '../catalog';
import type { GameFlowProps } from '../registry';
import { WavelengthEngine } from './engine';
import { SpectrumBar, BandScoreLegend } from './SpectrumBar';

type Props = { engine: WavelengthEngine; onExit: () => void };
const heading = [title(25), { color: Colors.textPrimary, textAlign: 'center' as const }];
const paragraph = [body(15, '500'), { color: Colors.textSecondary, textAlign: 'center' as const }];

export function WavelengthFlow({ roster, onExit }: GameFlowProps) {
  const [engine] = useState(() => new WavelengthEngine([...roster.players]));
  useObservable(engine);
  if (engine.phase === 'setup') return <Setup engine={engine} onExit={onExit} />;
  if (engine.phase === 'summary') return <Summary engine={engine} roster={roster} onExit={onExit} />;
  if (engine.phase === 'clue') return <Clue key={engine.round} engine={engine} onExit={onExit} />;
  return <Round engine={engine} onExit={onExit} />;
}

function TeamScores({ engine }: { engine: WavelengthEngine }) {
  return <View style={{ flexDirection: 'row', gap: 10 }}>
    {engine.scores.map((score, index) => <View key={index} style={{ flex: 1, padding: 14, gap: 4,
      borderRadius: 16, backgroundColor: Colors.surfaceHigh, borderWidth: 1,
      borderColor: index === engine.activeTeam ? Colors.phosphor : Colors.stroke }}>
      <Text style={[body(13, '700'), { color: Colors.textSecondary }]}>{engine.teamName(index)}</Text>
      <Text style={[title(26), { color: Colors.phosphor }]}>{score} ქულა</Text>
    </View>)}
  </View>;
}

function Frame({ engine, onExit, children, footer }: Props & { children: React.ReactNode; footer: React.ReactNode }) {
  return <View style={{ flex: 1 }}>
    <View style={Layout.topBar}>
      <GameExitButton onExit={onExit} />
      <Text style={[body(13, '700'), { color: Colors.textSecondary }]}>{engine.teamName(engine.activeTeam)} · სვლა {engine.round}</Text>
    </View>
    <ScrollView contentContainerStyle={[Layout.scroll, { gap: 20, flexGrow: 1 }]}>{children}</ScrollView>
    <View style={[Layout.footer, { gap: 10 }]}>{footer}</View>
  </View>;
}

function Setup({ engine, onExit }: Props) {
  const [rules, setRules] = useState(false);
  return <View style={{ flex: 1 }}>
    <RulesSheet visible={rules} title="ერთ ტალღაზე" accent={Colors.phosphor}
      steps={game('wavelength')?.howTo ?? []} onClose={() => setRules(false)} />
    <View style={Layout.header}><ScreenHeader title="ერთ ტალღაზე" subtitle="კლასიკური · ორი გუნდი"
      onBack={onExit} onInfo={() => setRules(true)} /></View>
    <ScrollView contentContainerStyle={Layout.scroll}>
      <Text style={paragraph}>გაიყავით ორ გუნდად. სახელზე შეხებით მოთამაშეს სხვა გუნდში გადაიყვან.</Text>
      {engine.teams.map((team, index) => <GlassCard key={index}>
        <View style={{ gap: 12 }}>
          <Text style={[body(18, '700'), { color: Colors.phosphor }]}>{engine.teamName(index)}</Text>
          {team.map(player => <Pressable key={player.id} accessibilityRole="button"
            accessibilityLabel={`${player.name} — სხვა გუნდში გადაყვანა`} onPress={() => engine.movePlayer(player.id)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}>
            <PlayerAvatarView player={player} size={40} />
            <Text style={[body(16, '600'), { flex: 1, color: Colors.textPrimary }]}>{player.name}</Text>
            <Text style={{ color: Colors.phosphor }}>↔</Text>
          </Pressable>)}
        </View>
      </GlassCard>)}
      <Text style={paragraph}>{engine.canPlay ? 'მიზანი: 10 ქულა · მეორე გუნდი იწყებს 1 ქულით' : 'თითო გუნდში მინიმუმ 2 მოთამაშეა საჭირო.'}</Text>
    </ScrollView>
    <View style={Layout.footer}><PrimaryButton title="დაწყება" enabled={engine.canPlay} onPress={() => engine.startGame()} /></View>
  </View>;
}

function Clue({ engine, onExit }: Props) {
  const [holding, setHolding] = useState(false);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const sub = AppState.addEventListener('change', () => setHolding(false));
    return () => sub.remove();
  }, []);
  return <Frame engine={engine} onExit={onExit} footer={<PrimaryButton title="დამალე და გადაეცი" enabled={seen}
    onPress={() => { setHolding(false); engine.beginGuess(); }} />}>
    <Text style={heading}>{engine.clueGiver?.name}, მოიფიქრე მინიშნება</Text>
    <GlassCard><SpectrumBar spectrum={engine.spectrum} target={holding ? engine.target : null} showBands={holding} /></GlassCard>
    <Pressable accessibilityRole="button" accessibilityLabel="სამიზნის სანახავად აქ გეჭიროს"
      onPressIn={() => { setHolding(true); setSeen(true); Haptics.reveal(); }} onPressOut={() => setHolding(false)}
      style={{ padding: 20, borderRadius: 16, borderWidth: 1, borderColor: Colors.phosphor, backgroundColor: Colors.surfaceHigh }}>
      <Text style={[body(16, '700'), { textAlign: 'center', color: Colors.phosphor }]}>{holding ? 'აშვებისას სამიზნე დაიმალება' : 'სამიზნის სანახავად აქ გეჭიროს'}</Text>
    </Pressable>
    <Text style={paragraph}>თქვი ერთი მინიშნება — სიტყვა ან მოკლე ფრაზა, რომელიც ამ ორ ცნებას შორის სამიზნის ადგილს შეეფერება. არ გამოიყენო შკალის სიტყვები, მათი სინონიმები ან ადგილის მიმანიშნებელი რიცხვები.</Text>
    <Text style={paragraph}>მინიშნების შემდეგ თანაგუნდელებს აღარ დაეხმარო არც სიტყვით, არც ჟესტით.</Text>
  </Frame>;
}

function Round({ engine, onExit }: Props) {
  const phase = engine.phase;
  // ფაზის ღილაკები ერთსა და იმავე ადგილასაა — ორმაგი შეხება შემდეგ ნაბიჯსაც
  // დააჭერდა (მაგ. „დაფიქსირება“ → მეტოქის „მარჯვნივ“). ახალ ფაზაზე პირველ წამს ვერ დააჭერ.
  const phaseAt = useRef({ phase, at: Date.now() });
  if (phaseAt.current.phase !== phase) phaseAt.current = { phase, at: Date.now() };
  const guard = (action: () => void) => () => { if (Date.now() - phaseAt.current.at >= 600) action(); };
  useEffect(() => {
    if (phase === 'result') {
      Sound.play(engine.lastPoints ? 'correct' : 'wrong');
      if (engine.lastPoints === 4) Haptics.success();
    }
  }, [phase, engine.lastPoints]);
  let footer: React.ReactNode;
  let content: React.ReactNode;
  switch (phase) {
    case 'pass':
      content = <><PlayerCharacter player={engine.clueGiver} /><Text style={paragraph}>გადაეცი ტელეფონი</Text>
        <Text style={heading}>{engine.clueGiver?.name}</Text><Text style={paragraph}>სამიზნეს მხოლოდ მიმანიშნებელი ხედავს. დანარჩენებმა ეკრანს არ შეხედოთ.</Text></>;
      footer = <PrimaryButton title="ტელეფონი ჩემთანაა" onPress={guard(() => engine.readyForClue())} />; break;
    case 'handoff':
      content = <><Text style={heading}>სამიზნე დამალულია</Text><Text style={paragraph}>გადაეცი ტელეფონი თანაგუნდელებს:</Text>
        <Text style={heading}>{engine.guessers.map(p => p.name).join(' · ')}</Text>
        <Text style={paragraph}>{engine.clueGiver?.name}, მინიშნების შემდეგ აღარ დაეხმარო.</Text></>;
      footer = <PrimaryButton title="ტელეფონი ჩვენთანაა" onPress={guard(() => engine.readyToGuess())} />; break;
    case 'guess':
      content = <><TeamScores engine={engine} /><Text style={heading}>სად ჯდება მინიშნება?</Text>
        <GlassCard><SpectrumBar spectrum={engine.spectrum} guess={engine.guess} interactive onValueChange={v => engine.setGuess(v)} /></GlassCard>
        <Text style={paragraph}>იმსჯელეთ თანაგუნდელებმა და თითით მოატრიალეთ ისარი შეთანხმებულ ადგილზე.</Text></>;
      footer = <PrimaryButton title="დაფიქსირება" onPress={guard(() => engine.lockGuess())} />; break;
    case 'side':
      content = <><Text style={heading}>{engine.teamName(engine.otherTeam)} — თქვენი ვარაუდი</Text>
        <Text style={paragraph}>ტელეფონი მეტოქე გუნდს გადაეცით. სამიზნის ცენტრი დაფიქსირებული ისრის მარცხნივაა თუ მარჯვნივ?</Text>
        <GlassCard><SpectrumBar spectrum={engine.spectrum} guess={engine.guess} /></GlassCard>
        <Text style={paragraph}>სწორი მხარე +1 ქულაა, თუ ისარი 4-ქულიან ცენტრში არ დგას.</Text></>;
      footer = <><PrimaryButton title="ისრის მარცხნივ" onPress={guard(() => engine.chooseSide('left'))} />
        <PrimaryButton title="ისრის მარჯვნივ" tint={Colors.softLavender} onPress={guard(() => engine.chooseSide('right'))} /></>; break;
    case 'locked':
      content = <><Text style={heading}>ორივე პასუხი დაფიქსირებულია</Text>
        <GlassCard><SpectrumBar spectrum={engine.spectrum} guess={engine.guess} /></GlassCard>
        <Text style={paragraph}>ეკრანი ყველას აჩვენეთ და ერთად ნახეთ შედეგი.</Text></>;
      footer = <PrimaryButton title="გამოაჩინე სამიზნე" onPress={guard(() => engine.reveal())} />; break;
    case 'result':
      content = <><Text style={heading}>{engine.teamName(engine.activeTeam)} +{engine.lastPoints} · {engine.teamName(engine.otherTeam)} +{engine.otherPoints}</Text>
        <TeamScores engine={engine} /><GlassCard><SpectrumBar spectrum={engine.spectrum} target={engine.target} guess={engine.guess} showBands /></GlassCard>
        <BandScoreLegend /><Text style={paragraph}>მეტოქის ვარაუდი: {engine.sideGuess === 'left' ? 'მარცხნივ' : 'მარჯვნივ'} · {engine.lastPoints === 4 ? '4 ქულაზე მეტოქე ქულას ვერ იღებს' : engine.otherPoints ? 'სწორია!' : 'არ დაემთხვა'}</Text>
        {engine.catchUp && <Text style={paragraph}>4 ქულა და ჯერ კიდევ ჩამორჩებით — კიდევ თქვენი სვლაა, ახალი მიმანიშნებლით!</Text>}
        {engine.tiebreak && engine.winner === null && <Text style={paragraph}>დამატებითი სვლები — ორივე გუნდი კიდევ ერთხელ თამაშობს.</Text>}</>;
      footer = <PrimaryButton title={engine.winner !== null ? 'შედეგები' : engine.catchUp ? 'კიდევ ჩვენი სვლა' : 'შემდეგი გუნდი'} onPress={guard(() => engine.next())} />; break;
    default: return null;
  }
  return <Frame engine={engine} onExit={onExit} footer={footer}>{content}</Frame>;
}

function Summary({ engine, roster, onExit }: Props & Pick<GameFlowProps, 'roster'>) {
  useAwardOnce(() => engine.players.forEach(player => roster.addScore(engine.rewardFor(player), player.id)));
  return <Frame engine={engine} onExit={onExit} footer={<><PrimaryButton title="კიდევ ვითამაშოთ" onPress={() => engine.restart()} /><GhostButton title="დასრულება" onPress={onExit} /></>}>
    <Confetti /><Text style={heading}>გაიმარჯვა: {engine.teamName(engine.winner ?? 0)}</Text>
    <Text style={paragraph}>{engine.teams[engine.winner ?? 0].map(p => p.name).join(' · ')}</Text>
    <TeamScores engine={engine} /><Text style={paragraph}>აპის საერთო ტაბლოზე: გამარჯვებულებს +3, მეორე გუნდს +1</Text>
  </Frame>;
}
