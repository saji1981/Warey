import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WareyTheme } from '../../theme/Assets';
import { IAuthFlow } from '../../interfaces/IAuth';

interface RegisterScreenProps {
  authData: Partial<IAuthFlow>;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = (props) => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>RegisterScreen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WareyTheme.colors.surface,
  },
  text: {
    color: WareyTheme.colors.text,
  },
});
