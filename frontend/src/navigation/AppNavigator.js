import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import CreateSessionScreen from '../screens/CreateSessionScreen';
import JoinSessionScreen from '../screens/JoinSessionScreen';
import MeetingPointScreen from '../screens/MeetingPointScreen';
import WaitingRoomScreen from '../screens/WaitingRoomScreen';
import PreferencesScreen from '../screens/PreferencesScreen';
import SwipeScreen from '../screens/SwipeScreen';
import DecisionScreen from '../screens/DecisionScreen';
import HomeButton from '../components/HomeButton';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: true, headerTitle: '', headerRight: () => <HomeButton /> }}>
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="CreateSession" component={CreateSessionScreen} />
        <Stack.Screen name="JoinSession" component={JoinSessionScreen} />
        <Stack.Screen name="MeetingPoint" component={MeetingPointScreen} />
        <Stack.Screen name="WaitingRoom" component={WaitingRoomScreen} />
        <Stack.Screen name="Preferences" component={PreferencesScreen} />
        <Stack.Screen name="Swipe" component={SwipeScreen} />
        <Stack.Screen name="Decision" component={DecisionScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
