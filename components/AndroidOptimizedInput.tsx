import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Platform,
  Keyboard,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Check, AlertCircle } from 'lucide-react-native';
import {
  getAndroidMaterialTheme,
  triggerAndroidHaptics,
  showAndroidToast,
  getAndroidDeviceInfo,
} from '@/utils/androidOptimizations';
import {
  getAndroidAccessibilityProps,
  getAndroidInclusiveStyles,
} from '@/utils/accessibility';

interface AndroidOptimizedInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  type?: 'numeric' | 'text' | 'email';
  required?: boolean;
  maxLength?: number;
  onSubmit?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export default function AndroidOptimizedInput({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  type = 'text',
  required = false,
  maxLength,
  onSubmit,
  accessibilityLabel,
  accessibilityHint,
}: AndroidOptimizedInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  const materialTheme = getAndroidMaterialTheme();
  const deviceInfo = getAndroidDeviceInfo();

  useEffect(() => {
    // Animation du label flottant (Material Design)
    Animated.timing(animatedValue, {
      toValue: isFocused || value ? 1 : 0,
      duration: Platform.OS === 'android' ? 200 : 300,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  const handleFocus = () => {
    setIsFocused(true);
    if (Platform.OS === 'android') {
      triggerAndroidHaptics('light');
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    validateInput();
  };

  const validateInput = () => {
    let valid = true;

    if (required && !value.trim()) {
      valid = false;
    }

    if (type === 'numeric' && value && isNaN(Number(value))) {
      valid = false;
    }

    if (type === 'email' && value && !value.includes('@')) {
      valid = false;
    }

    setIsValid(valid);

    if (!valid && Platform.OS === 'android') {
      triggerAndroidHaptics('error');
      showAndroidToast(error || 'Valeur invalide', 'SHORT');
    }

    return valid;
  };

  const handleChangeText = (text: string) => {
    onChangeText(text);

    // Feedback haptique pour Android
    if (Platform.OS === 'android' && text.length > value.length) {
      triggerAndroidHaptics('light');
    }
  };

  const handleSubmitEditing = () => {
    if (validateInput()) {
      onSubmit?.();
      Keyboard.dismiss();

      if (Platform.OS === 'android') {
        triggerAndroidHaptics('success');
      }
    }
  };

  const getKeyboardType = () => {
    switch (type) {
      case 'numeric':
        return Platform.OS === 'android' ? 'numeric' : 'number-pad';
      case 'email':
        return 'email-address';
      default:
        return 'default';
    }
  };

  const labelStyle = {
    position: 'absolute' as const,
    left: 12,
    top: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [Platform.OS === 'android' ? 16 : 14, Platform.OS === 'android' ? -8 : -6],
    }),
    fontSize: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [16, Platform.OS === 'android' ? 12 : 11],
    }),
    color: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [
        isFocused ? materialTheme.primary : materialTheme.onSurface + '80',
        isFocused ? materialTheme.primary : materialTheme.onSurface,
      ],
    }),
    backgroundColor: materialTheme.surface,
    paddingHorizontal: 4,
    zIndex: 1,
  };

  return (
    <View style={[
      styles.container,
      Platform.OS === 'android' && {
        marginVertical: 8,
      }
    ]}>
      {label && (
        <Animated.Text
          style={[
            labelStyle,
            Platform.OS === 'android' && {
              fontWeight: isFocused ? '500' : 'normal',
            }
          ]}
        >
          {label}{required && ' *'}
        </Animated.Text>
      )}

      <View style={[
        styles.inputContainer,
        Platform.OS === 'android' && {
          borderRadius: materialTheme.shapes.cornerRadius.small,
          elevation: isFocused ? 2 : 0,
          backgroundColor: materialTheme.surface,
        },
        isFocused && Platform.OS === 'android' && {
          borderWidth: 2,
          borderColor: materialTheme.primary,
        },
        error && !isValid && {
          borderColor: materialTheme.error,
          borderWidth: 2,
        }
      ]}>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            Platform.OS === 'android' && {
              fontSize: deviceInfo.isTablet ? 18 : 16,
              paddingVertical: deviceInfo.isTablet ? 16 : 14,
              color: materialTheme.onSurface,
              ...(deviceInfo.isTablet ? {
                minHeight: 48,
                paddingVertical: 12
              } : {})
            }
          ]}
          value={value}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSubmitEditing}
          placeholder={placeholder}
          placeholderTextColor={materialTheme.onSurface + '60'}
          keyboardType={getKeyboardType()}
          maxLength={maxLength}
          returnKeyType={onSubmit ? 'done' : 'next'}
          blurOnSubmit={!!onSubmit}
          // Optimisations Android
          underlineColorAndroid="transparent"
          textContentType={type === 'email' ? 'emailAddress' : 'none'}
          autoComplete={type === 'email' ? 'email' : 'off'}
          importantForAutofill={type === 'email' ? 'yes' : 'no'}
          // Accessibilité
          accessibilityLabel={accessibilityLabel || label || placeholder || ''}
          accessibilityHint={accessibilityHint}
          accessibilityRole="text"
          accessible={true}
          importantForAccessibility="yes"
          accessibilityLiveRegion="polite"
        />

        {/* Indicateur de validation */}
        {value && (
          <View style={styles.validationIcon}>
            {isValid ? (
              <Check
                size={20}
                color={materialTheme.secondary}
              />
            ) : (
              <AlertCircle
                size={20}
                color={materialTheme.error}
              />
            )}
          </View>
        )}
      </View>

      {/* Message d'erreur */}
      {error && !isValid && (
        <Text style={[
          styles.errorText,
          Platform.OS === 'android' && {
            color: materialTheme.error,
            fontSize: 12,
            marginTop: 4,
            marginLeft: 12,
          }
        ]}>
          {error}
        </Text>
      )}

      {/* Compteur de caractères pour Android */}
      {maxLength && Platform.OS === 'android' && (
        <Text style={[
          styles.counterText,
          {
            color: materialTheme.onSurface + '80',
            fontSize: 11,
            textAlign: 'right',
            marginTop: 4,
            marginRight: 12,
          }
        ]}>
          {value.length}/{maxLength}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 16,
    fontSize: 16,
    color: '#2D3748',
    minHeight: Platform.OS === 'android' ? 48 : 44,
  },
  validationIcon: {
    marginRight: 12,
  },
  errorText: {
    color: '#F56565',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 12,
  },
  counterText: {
    fontSize: 11,
    color: '#A0AEC0',
    textAlign: 'right',
    marginTop: 4,
    marginRight: 12,
  },
});
