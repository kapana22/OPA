import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SplashBackground } from '../src/ui/SplashBackground';
import { Notice } from '../src/ui/Cards';
import { Colors } from '../src/theme/theme';

/**
 * უცნობი მარშრუტი — ძველი ან შეცდომით აკრეფილი ღრმა ბმული.
 *
 * expo-router-ის ნაგულისხმევი ეკრანი ინგლისურია და „Sitemap“-ს აჩვენებს —
 * მაღაზიის ვერსიაში ეს არ უნდა ჩანდეს. აქ იგივე `Notice`-ია, რაც დანარჩენ
 * ჩიხებზე, და გამოსასვლელი ყოველთვის მთავარ ეკრანზე მიდის.
 */
export default function NotFound() {
  const router = useRouter();
  return (
    <View style={{ flex: 1 }}>
      <SplashBackground />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <Notice
          icon="questionmark.circle"
          title="ასეთი გვერდი არ არის"
          text="ბმული ძველია ან შეცდომითაა. დაბრუნდი მთავარ ეკრანზე."
          onBack={() => router.replace('/')}
        />
      </SafeAreaView>
    </View>
  );
}
