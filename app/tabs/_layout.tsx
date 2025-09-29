import React from 'react';
import { FontAwesome, Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Tabs, Link } from 'expo-router';
import { Pressable } from 'react-native';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

export default function Layout() {
  const colorScheme = useColorScheme();
  const isClient = useClientOnlyValue(true, false);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          borderTopWidth: 0,
          elevation: 0,
          backgroundColor: '#0491C6',
          justifyContent: 'space-around',
        },
        tabBarItemStyle: {
          paddingTop: 5,
        },
      }}
    >
      <Tabs.Screen
        name="homeScreen"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Feather name="home" size={24} color="white" />,
          headerRight: () =>
            isClient ? (
              <Link href="./homeScreen" asChild>
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
            ) : null,
        }}
      />

      <Tabs.Screen
        name="community"
        options={{
          title: 'Comunidades',
          tabBarIcon: ({ color }) => <MaterialIcons name="people-alt" size={24} color="white" />,
        }}
      />

      <Tabs.Screen
        name="newPost"
        options={{
          title: 'NuevaPublicacion',
          tabBarIcon: ({ color }) => <Feather name="plus-square" size={24} color="white" />,
        }}
      />

      <Tabs.Screen
        name="busqueda"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => <Ionicons name="search-sharp" size={24} color="white" />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color="white" />,
        }}
      />
      <Tabs.Screen
        name="otherProfile"
        options={{
          tabBarButton: () => null, 
          tabBarItemStyle: { display: 'none' }, 
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="chatDetails"
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="notificaciones"
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}
