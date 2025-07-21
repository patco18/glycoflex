import { Home, User, Settings, Plus, Bell, Target, Globe, Accessibility, Clock, Cloud, RefreshCw, BarChart3, Info, Save } from 'lucide-react-native';
import React from 'react';
import { View, Text } from 'react-native';

export default function TestIcons() {
  return (
    <View>
      <Text>Test des icônes</Text>
      <Home size={24} color="#000" />
      <User size={24} color="#000" />
      <Settings size={24} color="#000" />
      <Plus size={24} color="#000" />
      <BarChart3 size={24} color="#000" />
      <Bell size={24} color="#000" />
      <Target size={24} color="#000" />
      <Globe size={24} color="#000" />
      <Accessibility size={24} color="#000" />
      <Clock size={24} color="#000" />
      <Cloud size={24} color="#000" />
      <RefreshCw size={24} color="#000" />
      <Info size={24} color="#000" />
      <Save size={24} color="#000" />
    </View>
  );
}
