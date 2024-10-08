import React, { useState, useEffect } from 'react';
import { SafeAreaView,View, Text, StyleSheet, Alert,Dimensions, ScrollView } from 'react-native';
import { InputFields,StepIndicator,CustomBtn,MacroCalculator } from '../../src/components';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../src/api';

const { width } = Dimensions.get('window'); // Get the screen width


// 표준체중 계산 함수
const calculateStandardWeight = (height, gender) => {
    const heightInMeters = height / 100;
    const factor = gender === 'female' ? 21 : 22;
    return heightInMeters * heightInMeters * factor;
};

// 칼로리 계산 함수
const calculateCalories = (height, gender, exerciseLevel) => {
    const standardWeight = calculateStandardWeight(height, gender);
    let calorieMultiplier;

    switch (exerciseLevel) {
        case 'beginner':
            calorieMultiplier = [25, 30];
            break;
        case 'middle':
            calorieMultiplier = [30, 35];
            break;
        case 'expert':
            calorieMultiplier = [35, 40];
            break;
        default:
            calorieMultiplier = [0, 0];
    }

    return {
        standardWeight: Math.round(standardWeight),
        minCalories: Math.round(standardWeight * calorieMultiplier[0]),
        maxCalories: Math.round(standardWeight * calorieMultiplier[1])
    };
};

//영양성분 계산 함수

// 칼로리 화면 컴포넌트
const CaloriesScreen = () => {
    const router = useRouter();
    //현재 단계
    const [currentStep, setCurrentStep] = useState(2);

    //expo-router로 받은 params
    const { gender, height, exerciseLevel, goal } = useLocalSearchParams();

    //계산된 칼로리 값
    const [calorieInfo, setCalorieInfo] = useState({
        minCalories: 0,
        maxCalories: 0,
    });

    // 사용자가 설정한 칼로리 값
    const [userCalories, setUserCalories] = useState('');

    const [resCalorieInfo, setResCalorieInfo] = useState({
        totalCalories: 0,
        carbs: 0,
        fat: 0,
        protein: 0
    });

    const handleMacroCalculatorChange = (newCalorieInfo) => {
        setResCalorieInfo(newCalorieInfo);
    };

    useEffect(() => {
        const calcResults = calculateCalories(height, gender, exerciseLevel);
        setCalorieInfo(calcResults);
        setUserCalories(calcResults.minCalories.toString());
    }, [height, gender, exerciseLevel]);

    const handleCalorieChange = text => {
        setUserCalories(text.replace(/[^0-9]/g, ''));
    };

    //다음 단계
    const handleNextStep = () => {
        const numCalories = parseInt(userCalories, 10);
        if (!userCalories || numCalories < (calorieInfo.minCalories - 500) || numCalories > calorieInfo.maxCalories) {
            Alert.alert('칼로리 설정 오류', ` ${calorieInfo.minCalories - 500} ~ ${calorieInfo.maxCalories} kcal 사이로 설정해주세요.`);
            return;
        }
        Alert.alert('목표 칼로리 설정 완료', `일일 목표 칼로리가 ${userCalories} kcal로 설정되었습니다.`);
        setCurrentStep(currentStep + 1);
    };

    //다음 화면 이동 함수 
    const handleNextPress = () => {
        // Send server
        AsyncStorage.getItem('userId').then((userId) => {
            console.log(userId);
            console.log(userCalories);
            API.insertCalories(userId, parseInt(userCalories, 10), resCalorieInfo.carbs, resCalorieInfo.protein, resCalorieInfo.fat)
                .then((result) => {
                    console.log('Response from server:', result);
                });
        })
        console.log(JSON.stringify(resCalorieInfo));
        router.push({ pathname: 'screens/characterGAN' })
    };

    return (
        <SafeAreaView style={styles.mainContainer}>
            <StepIndicator steps={['Step 1', 'Step 2', 'Step 3', 'Step 4']} currentStep={currentStep - 1}/>
                {currentStep === 2 && (
                    <View style={styles.mainContainer}>
                        <View style={styles.container}>
                            <Text style={styles.title}>목표 칼로리를 {"\n"}계산해드렸어요 🔥</Text>
                            <Text style={styles.description}>
                                일일 권장 섭취량은{" "}
                                <Text style={styles.highlightedText}>
                                    {calorieInfo.minCalories} ~ {calorieInfo.maxCalories} kcal {""}
                                </Text>
                                예요.{"\n"}다이어트를 위한 목표량을 직접 입력할 수도 있어요.
                            </Text>                            
                        </View>
                        <View style={styles.contentContainer}>
                            <InputFields
                                label="목표 섭취 열량 (kcal)"
                                placeholder="목표 섭취 열량을 입력해주세요."
                                unit="kcal"
                                unitStyle= {styles.kcalText}
                                viewStyle= {styles.input}
                                inputStyle={styles.kcalText}
                                textInputProps={{
                                    onChangeText: handleCalorieChange, // 상태 업데이트 함수 직접 전달
                                    value: userCalories, // 상태 값 직접 전달
                                    keyboardType: 'numeric'
                                }}
                            />
                        </View>
                        <View style={styles.contentContainer}>
                            <CustomBtn
                                title="꿀팁!"
                                textStyle={styles.highlightedText}
                                buttonStyle={styles.label}/>
                            <Text style={styles.description}>일반적으로 권장 섭취량보다 {""}
                                <Text style={styles.highlightedText}>500 kcal {""}</Text>
                                정도 {"\n"}적게 먹으면 감량 효과를 기대할 수 있어요.
                            </Text>
                        </View>
                        <View style={{alignItems: 'center'}}>
                            <CustomBtn 
                                onPress={handleNextStep}
                                title=" 다음 " 
                                buttonStyle={styles.finishBtn}
                            />
                        </View>
                    </View>
                )}
                {currentStep ===3 && (
                    <ScrollView style={styles.mainContainer}>
                        <Text style={styles.title}>목표 탄단지 정하기 {"\n"}이제 다 왔어요👏</Text>
                        <Text style={styles.description}>목표 열량과 식단에 맞는 
                            <Text style={styles.highlightedText}> 추천 섭취량</Text>
                            을 계산했어요. {"\n"}목표량을 직접 입력할 수도 있어요.
                        </Text>
                        <MacroCalculator
                            totalCalories={userCalories}
                            goal={goal}
                            minCalories={calorieInfo.minCalories}
                            maxCalories={calorieInfo.maxCalories}
                            onChange={handleMacroCalculatorChange}
                        />
                        <View style={{ alignItems: 'center' }}>
                            <CustomBtn
                                onPress={handleNextPress}
                                title=" 다음 "
                                buttonStyle={styles.finishBtn}
                            />
                        </View>
                    </ScrollView>
                )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        padding: 10,
        flex: 1,
        backgroundColor: "white"
    },
    container: {
        flex: 1,
        backgroundColor: "white",
    },
    contentContainer: {
        flex: 2,
        alignItems: 'center', //가로 중앙에 정렬
        justifyContent: 'flex-start',
        marginTop: 50
    },
    finishBtn: {
        backgroundColor: '#99aff8',
        width: width * 0.85,
        marginTop:30
    },
    label: {
        backgroundColor: '#E1F1FE',
        width: width * 0.2,
        height:40,
        padding: 0
    },
    title: {
        fontFamily:"Jua",
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    description: {
        fontSize: 18,
        marginBottom: 20,
        fontWeight:"500",
        color:"#555",
        fontFamily:"Jua"
    },
    input: {
        marginTop: 10,
        height: 60,
        justifyContent: "center",
        alignItems: "flex-start",
        width: width * 0.9,
    },
    finishBtn: {
        backgroundColor: '#99aff8',
        width: width * 0.85,
    },
    kcalText:{
        fontFamily:"Jua",
        color:"#444",
        fontSize: 20,
        fontWeight: "bold"
    },
    highlightedText:{
        fontFamily:"Jua",
        color:"#1490FB",
        fontSize: 18
    }
});

export default CaloriesScreen;
