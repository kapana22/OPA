import { PlayerCharacter } from '../../ui/PlayerCharacter';
import { useEffect, useState } from 'react';
import { AppState, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { Colors, body, title as titleFont } from '../../theme/theme';
import { GlassCard, ScreenHeader } from '../../ui/Cards';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Pressable } from '../../ui/Pressable';
import { Layout } from '../../ui/layout';
import { useObservable } from '../../core/observable';
import { useAwardOnce } from '../../core/awardOnce';
import type { GameFlowProps } from '../registry';
import { HerdEngine } from './engine';
import { useDialog } from '../../ui/Dialog';

const textStyle = [body(15, '500'), { color: Colors.textPrimary }];
export function HerdFlow({ roster, onExit }: GameFlowProps) {
  const [engine] = useState(() => new HerdEngine([...roster.players]));
  useObservable(engine);
  const dialog = useDialog();
  // თამაშის შუაში ერთი შეხება მთელ პარტიას აგდებდა — სხვა რეჟიმების მსგავსად ჯერ ვეკითხებით.
  const back = () => {
    if (engine.phase === 'setup' || engine.phase === 'summary') return onExit();
    dialog({
      title: 'თამაშიდან გასვლა?',
      message: 'მიმდინარე რაუნდი დაიკარგება.',
      actions: [
        { label: 'გაგრძელება' },
        { label: 'გასვლა', primary: true, destructive: true, onPress: onExit },
      ],
    });
  };
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => { if (state !== 'active') engine.hideAnswer(); });
    return () => sub.remove();
  }, [engine]);
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={Layout.header}><ScreenHeader title="Herd Mentality" subtitle="კლასიკური · როგორც ყველა" onBack={back} /></View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[Layout.scroll, { gap: 16 }]}>
        {engine.phase === 'setup' ? <>
          <GlassCard><Text style={textStyle}>
            ერთი კითხვა — თითოეული ფარულად წერს ერთ პასუხს. იფიქრე, რას დაწერენ სხვები!{ '\n\n' }
            ყველაზე ხშირ პასუხზე თითოეულს +1 ქულა ერგება. ყველაზე ხშირ პასუხებს შორის ფრისას ქულა არავის ეწერება.{ '\n\n' }
            თუ მხოლოდ ერთ ადამიანს აქვს უნიკალური პასუხი, მას „ვარდისფერი ძროხა“ გადაეცემა. ძროხა რჩება მასთან, სანამ სხვა ერთადერთი განსხვავებული პასუხი არ გამოჩნდება.{ '\n\n' }
            მიზანი: 8 ქულა ძროხის გარეშე. ძროხით ქულებს აგროვებ, მაგრამ ვერ იგებ. ერთდროულად მიზნის მიღწევისას გამარჯვებას იყოფთ.
          </Text></GlassCard>
          <Text style={textStyle}>ერთ ტელეფონზე რიგრიგობით ჩაწერეთ პასუხები. სხვისი პასუხის ნახვამდე საკუთარი უნდა დააფიქსირო.</Text>
          {!engine.canPlay && <Text style={textStyle}>საჭიროა მინიმუმ 4 მოთამაშე.</Text>}
          <PrimaryButton title="დაწყება" enabled={engine.canPlay} onPress={() => engine.startGame()} />
        </> : null}
        {engine.phase === 'intro' ? <>
          <Text style={textStyle}>რაუნდი {engine.round} · მიზანი 8 ქულა</Text>
          <GlassCard><Text style={[titleFont(25), { color: Colors.textPrimary }]}>{engine.question}</Text></GlassCard>
          <Text style={textStyle}>წაიკითხეთ ხმამაღლა. პასუხები ჯერ არ თქვათ.</Text>
          <PrimaryButton title="ფარულად ვპასუხობთ" onPress={() => engine.beginVoting()} />
          <GhostButton title="სხვა კითხვა" onPress={() => engine.skipQuestion()} />
          <Scores engine={engine} />
        </> : null}
        {engine.phase === 'pass' ? <>
          <PlayerCharacter player={engine.currentVoter} />
          <Text style={[titleFont(26), { color: Colors.phosphor }]}>გადაეცი {engine.currentVoter?.name}-ს</Text>
          <Text style={textStyle}>მხოლოდ შენ ნახე ეკრანი. დაწერე პასუხი, რომელსაც სხვებისგანაც ელოდები.</Text>
          <PrimaryButton title="ტელეფონი ჩემთანაა" onPress={() => engine.beginWriting()} />
        </> : null}
        {engine.phase === 'writing' ? <Answer key={`${engine.round}:${engine.voterIndex}`} engine={engine} /> : null}
        {engine.phase === 'review' ? <Review engine={engine} /> : null}
        {engine.phase === 'result' ? <>
          <Text style={[titleFont(24), { color: Colors.phosphor }]}>{engine.isTie ? 'ფრე — ქულა არავის' : 'ერთნაირად იფიქრეთ!'}</Text>
          {engine.answerGroups.map(group => <GlassCard key={group.id}>
            <Text style={textStyle}>{group.players.map(p => `${p.name}: ${engine.answers[p.id]}${engine.roundWinners.includes(p.id) ? ' (+1)' : ''}`).join('\n')}</Text>
          </GlassCard>)}
          <Scores engine={engine} />
          <PrimaryButton title={engine.winners.length ? 'საბოლოო შედეგები' : 'შემდეგი რაუნდი'} onPress={() => engine.next()} />
        </> : null}
        {engine.phase === 'summary' ? <Summary engine={engine} roster={roster} onExit={onExit} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
function Answer({ engine }: { engine: HerdEngine }) {
  // ფონზე გადასვლისას ეკრანი იმალება; იმავე მოთამაშეს დაწერილი ტექსტი უბრუნდება.
  const [answer, setAnswerState] = useState(engine.draft);
  const setAnswer = (text: string) => { setAnswerState(text); engine.setDraft(text); };
  return <>
    <Text style={textStyle}>{engine.currentVoter?.name}</Text>
    <Text style={[titleFont(23), { color: Colors.textPrimary }]}>{engine.question}</Text>
    <TextInput value={answer} onChangeText={setAnswer} maxLength={80} autoFocus autoCorrect={false}
      accessibilityLabel="შენი ფარული პასუხი" placeholder="ერთი მოკლე პასუხი" placeholderTextColor={Colors.textSecondary}
      style={[body(20, '600'), { color: Colors.textPrimary, backgroundColor: Colors.surface, padding: 18, borderRadius: 16 }]}
      returnKeyType="done" onSubmitEditing={() => engine.submit(answer)} />
    <PrimaryButton title="დამალე და გადაეცი" enabled={answer.trim().length > 0} onPress={() => engine.submit(answer)} />
  </>;
}
function Review({ engine }: { engine: HerdEngine }) {
  const [selected, setSelected] = useState<string[]>([]);
  return <>
    <Text style={[titleFont(24), { color: Colors.phosphor }]}>გამოვაჩინოთ პასუხები</Text>
    <Text style={textStyle}>ერთნაირი მნიშვნელობის პასუხები სხვადასხვა ჯგუფშია? მონიშნეთ და გააერთიანეთ მხოლოდ ყველას შეთანხმებით.</Text>
    {engine.answerGroups.map(group => <Pressable key={group.id} accessibilityRole="checkbox"
      accessibilityState={{ checked: selected.includes(group.id) }}
      onPress={() => setSelected(prev => prev.includes(group.id) ? prev.filter(id => id !== group.id) : [...prev, group.id])}
      style={{ padding: 16, borderRadius: 16, borderWidth: 2,
        borderColor: selected.includes(group.id) ? Colors.phosphor : Colors.surface,
        backgroundColor: Colors.surface }}>
      <Text style={textStyle}>{group.players.map(p => `${p.name}: ${engine.answers[p.id]}`).join('\n')}</Text>
    </Pressable>)}
    <PrimaryButton title="მონიშნული პასუხების გაერთიანება" enabled={selected.length >= 2}
      onPress={() => { engine.mergeGroups(selected); setSelected([]); }} />
    <GhostButton title="გაერთიანებების გაუქმება" onPress={() => { engine.resetGroups(); setSelected([]); }} />
    <PrimaryButton title="პასუხები სწორადაა — დათვალე ქულები" onPress={() => engine.scoreRound()} />
  </>;
}
function Scores({ engine }: { engine: HerdEngine }) {
  return <GlassCard>
    {engine.ranking.map(p => <Text key={p.id} style={textStyle}>
      {p.name} — {engine.totalFor(p)}{p.id === engine.pinkCow ? ' · 🐄 ვარდისფერი ძროხა' : ''}
    </Text>)}
    {engine.pinkCow && <Text style={textStyle}>ძროხის მფლობელს გამარჯვებისთვის მისი გადაცემა სჭირდება.</Text>}
  </GlassCard>;
}
function Summary({ engine, roster, onExit }: { engine: HerdEngine } & GameFlowProps) {
  useAwardOnce(() => { for (const id of engine.winners) roster.addScore(3, id); });
  return <>
    <Text style={[titleFont(26), { color: Colors.phosphor }]}>მოიგო: {engine.players.filter(p => engine.winners.includes(p.id)).map(p => p.name).join(', ')}</Text>
    <Scores engine={engine} />
    <Text style={textStyle}>თითოეულ გამარჯვებულს საერთო ტაბლოზე +3 ქულა.</Text>
    <PrimaryButton title="თავიდან" onPress={() => engine.startGame()} />
    <GhostButton title="დასრულება" onPress={onExit} />
  </>;
}
