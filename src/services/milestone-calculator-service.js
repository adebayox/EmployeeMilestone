import { logger } from "../utils/logger.js";


export class MilestoneCalculatorService {
  constructor() {
    
    this.milestoneAmounts = {
      Birthday: 2,
      "2-Year": 2,
      "3-Year": 2,
      "4-Year": 2,
      "5-Year": 2,
      "10-Year": 2,
      "15-Year": 2,
      "20-Year": 2,
    };
  }

 
  calculateNextMilestone(hireDate, birthday, today = new Date()) {
    const milestones = [];

    if (birthday) {
      const nextBirthday = this.getNextAnniversary(birthday, today);
      milestones.push({
        date: nextBirthday,
        type: "Birthday",
        amount: this.milestoneAmounts["Birthday"],
      });
    }

    if (hireDate) {
      const workAnniversaries = this.calculateWorkAnniversaries(
        hireDate,
        today
      );
      milestones.push(...workAnniversaries);
    }

    if (milestones.length === 0) return null;

    milestones.sort((a, b) => a.date.getTime() - b.date.getTime());
    return milestones[0];
  }


  getNextAnniversary(originalDate, today = new Date()) {
    const anniversary = new Date(originalDate);
    const currentYear = today.getFullYear();

    
    anniversary.setFullYear(currentYear);

    if (anniversary < today) {
      anniversary.setFullYear(currentYear + 1);
    }

    return anniversary;
  }

  calculateWorkAnniversaries(hireDate, today = new Date()) {
    const anniversaries = [];
    const hire = new Date(hireDate);


    let yearsOfService = today.getFullYear() - hire.getFullYear();
    const monthDiff = today.getMonth() - hire.getMonth();
    const dayDiff = today.getDate() - hire.getDate();

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      yearsOfService--;
    }


    const milestoneYears = [1, 2, 3, 4, 5, 10, 15, 20, 25, 30];

    for (const year of milestoneYears) {
      if (year > yearsOfService) {
        const anniversaryDate = new Date(hire);
        anniversaryDate.setFullYear(hire.getFullYear() + year);

        const oneYearFromNow = new Date(today);
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

        if (anniversaryDate <= oneYearFromNow) {
          const milestoneType = `${year}-Year`;
          anniversaries.push({
            date: anniversaryDate,
            type: milestoneType,
            amount: this.milestoneAmounts[milestoneType] || 100,
          });
        }
        break; 
      }
    }

    return anniversaries;
  }

  
  shouldProcessMilestone(
    milestoneDate,
    lastProcessedDate = null,
    today = new Date()
  ) {
    if (!milestoneDate) return false;

    
    const milestone = new Date(milestoneDate);

   
    const isToday =
      milestone.getDate() === today.getDate() &&
      milestone.getMonth() === today.getMonth() &&
      milestone.getFullYear() === today.getFullYear();

    if (!isToday) return false;

    
    if (lastProcessedDate) {
      const lastProcessed = new Date(lastProcessedDate);
      const sameYear = lastProcessed.getFullYear() === today.getFullYear();
      const sameMonth = lastProcessed.getMonth() === today.getMonth();
      const sameDay = lastProcessed.getDate() === today.getDate();

      if (sameYear && sameMonth && sameDay) {
        return false; 
      }
    }

    return true;
  }

  
  getMilestoneAmount(milestoneType) {
    return this.milestoneAmounts[milestoneType] || 50;
  }

  
  calculateMilestonesInRange(employee, startDate, endDate) {
    const milestones = [];
    const { hireDate, birthday } = employee;

  
    if (birthday) {
      const nextBirthday = this.getNextAnniversary(birthday, startDate);
      if (nextBirthday >= startDate && nextBirthday <= endDate) {
        milestones.push({
          ...employee,
          milestoneDate: nextBirthday,
          milestoneType: "Birthday",
          amount: this.milestoneAmounts["Birthday"],
        });
      }
    }

    
    if (hireDate) {
      const anniversaries = this.calculateWorkAnniversaries(
        hireDate,
        startDate
      );
      for (const anniversary of anniversaries) {
        if (anniversary.date >= startDate && anniversary.date <= endDate) {
          milestones.push({
            ...employee,
            milestoneDate: anniversary.date,
            milestoneType: anniversary.type,
            amount: anniversary.amount,
          });
        }
      }
    }

    return milestones;
  }

  
  updateNextMilestone(hireDate, birthday, currentMilestoneType) {
    const today = new Date();

   
    if (currentMilestoneType === "Birthday") {
      const nextWorkMilestone = this.calculateWorkAnniversaries(
        hireDate,
        today
      )[0];
      const nextBirthday = this.getNextAnniversary(birthday, today);

      if (nextWorkMilestone && nextWorkMilestone.date < nextBirthday) {
        return {
          date: nextWorkMilestone.date,
          type: nextWorkMilestone.type,
          amount: nextWorkMilestone.amount,
        };
      } else {
        return {
          date: nextBirthday,
          type: "Birthday",
          amount: this.milestoneAmounts["Birthday"],
        };
      }
    }

   
    const nextMilestone = this.calculateNextMilestone(
      hireDate,
      birthday,
      today
    );
    return nextMilestone;
  }
}
