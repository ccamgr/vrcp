import { TouchableOpacity } from "@/components/CustomElements";
import { fontSize, spacing } from "@/configs/styles";
import { isSameDate } from "@/libs/date";
import { getTintedColor } from "@/libs/utils";
import { Button, Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";



interface CalendarViewProps {
  renderDateContent?: (date: Date) => React.ReactNode;
  initialDate?: Date;
  onSelectDate?: (date: Date) => void;
  onChangeMonth?: (month: Date) => void;
}

const MonthlyCalendarView = ({
  renderDateContent,
  initialDate = new Date(),
  onSelectDate,
  onChangeMonth
}: CalendarViewProps) => {
  const theme = useTheme();
  const [selectedMonth, setSelectedMonth] = useState<Date>(initialDate);
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const today = new Date();

  const calendarWeeks = useMemo<Date[][]>(() => {
    const weeks: Date[][] = [];
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    let currentWeek: Date[] = [];
    // start from  Sunday and end on Saturday
    let currentDate = new Date(firstDayOfMonth);
    currentDate.setDate(currentDate.getDate() - currentDate.getDay());
    const endDate = new Date(lastDayOfMonth);
    endDate.setDate(endDate.getDate() + (6 - lastDayOfMonth.getDay()));
    while (currentDate <= endDate) {
      currentWeek.push(new Date(currentDate));
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return weeks;
  }, [selectedMonth]);

  const handleChangeMonth = (monthOffset: number) => {
    const newMonth = new Date(
      selectedMonth.getFullYear(),
      selectedMonth.getMonth() + monthOffset,
      1
    );
    setSelectedMonth(newMonth);
    onChangeMonth?.(newMonth);
  };

  const handleTapDate = (date: Date) => {
    setSelectedDate(date);
    onSelectDate?.(date);
  }

  const getDateColor = (date: Date) => {
    if (isSameDate(date, today)) {
      return theme.colors.primary;
    }
    let dateColor = theme.colors.text;
    if (date.getDay() === 6) {
      dateColor = theme.colors.error;
    } else if (date.getDay() === 0) {
      dateColor = theme.colors.info;
    }

    if (date.getMonth() !== selectedMonth.getMonth()) {
      dateColor = getTintedColor(dateColor, 0.60); 
    };
    return dateColor;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={[ styles.header ,{ color: theme.colors.text }]}>
          {selectedMonth.toLocaleString([], { month: "long", year: "numeric" })}
        </Text>
        <View style={[styles.buttons]}>
          <Button
            style={styles.button}
            onPress={() => handleChangeMonth(-1)}
            color={theme.colors.text}
          > {"<"} </Button>
          <Button
            style={styles.button}
            onPress={() => handleChangeMonth(1)}
            color={theme.colors.text}
          > {">"} </Button>
        </View>
      </View>
      <View style={[styles.calendarContainer, styles.border]} >
      {calendarWeeks.map((week, weekIndex) => (
        <View key={weekIndex} style={[styles.weekContainer, { height: `${100 / calendarWeeks.length}%` }]}>
          {week.map((date, dateIndex) => (
            <TouchableOpacity style={[styles.border, styles.dateContainer, isSameDate(date, selectedDate) ? styles.selectedDate : null]} onPress={() => handleTapDate(date)} key={dateIndex} >
              <Text style={[styles.dateNumber, {color: getDateColor(date) }]}>{date.getDate()}</Text>
              {renderDateContent ? renderDateContent(date) : null}
            </TouchableOpacity>
          ))}
        </View>
      ))}
      </View>
    </View>
  );

}


const styles = StyleSheet.create({
  container: {
    padding: spacing.small,
    aspectRatio: 1.2,

    // borderColor: "blue",
    // borderWidth: 1,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: spacing.small,
  },
  header: {
    fontSize: fontSize.medium,
    fontWeight: "bold",
    paddingHorizontal: spacing.medium,
  },
  buttons: {
    flexDirection: "row",
    gap: spacing.small,
  },
  button: {
    paddingVertical: spacing.mini,
    paddingHorizontal: spacing.large * 2,
  },
  calendarContainer: {
    marginBottom: spacing.small * 4 + fontSize.small,
  },
  weekContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    // maxHeight: 60,
  },
  dateContainer: {
    padding: spacing.mini,
    width: `${100 / 7}%`,
  },
  dateNumber: {
    fontSize: fontSize.small,
    width: "100%",
    paddingHorizontal: spacing.mini,
  },

  border: {
    borderColor: "gray",
    borderWidth: 0.5,
  },
  selectedDate: {
    borderColor: "cornflowerblue",
    backgroundColor: "rgba(100, 149, 237, 0.2)", // cornflowerblue with opacity
  },

}); 

export default MonthlyCalendarView;