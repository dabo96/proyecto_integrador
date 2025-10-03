import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs } from 'expo-router';
import { Pressable } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import Stack from 'expo-router';


export default function Layout() {
  const colorScheme = useColorScheme();

  // Ensure the value is only used on the client side
  const isClient = useClientOnlyValue(true, false);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <FontAwesome name="home" size={24} color={color} />,
          headerRight: () => (
            isClient ? (
              <Link href="/HomeScreen" asChild>
                <Pressable>
                  {({ pressed }) => (
                    <FontAwesome
                      name="info-circle"
                      size={25}
                      color={Colors[colorScheme ?? 'light'].text}
                      style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
                    />
                  )}
                </Pressable>
              </Link>
            ) : null
          ),
        }}
      />
      <Tabs.Screen
        name="AddItemScreen"
        options={{
          title: 'Add Item',
          tabBarIcon: ({ color }) => <FontAwesome name="plus-square" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}