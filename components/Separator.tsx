import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function Separator() {
    return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
    separator: {
        flex: 1,
        height: 1,
        backgroundColor: '#CED0CE',
        marginVertical: 10,
    },
});