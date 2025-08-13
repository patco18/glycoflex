import { Alert, Platform, ToastAndroid } from 'react-native';

export interface ToastButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export function showToast(title: string, message?: string, buttons?: ToastButton[]) {
  if (Platform.OS === 'android' && (!buttons || buttons.length === 0)) {
    ToastAndroid.show(
      message ? `${title}: ${message}` : title,
      ToastAndroid.LONG
    );
  } else {
    Alert.alert(title, message, buttons);
  }
}

export function useToast() {
  return {
    show: (title: string, message?: string, buttons?: ToastButton[]) =>
      showToast(title, message, buttons)
  };
}
