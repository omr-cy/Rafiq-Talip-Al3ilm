import localforage from 'localforage';

export interface Note {
  id: string;
  title: string;
  type: 'majlis' | 'takhreej' | 'tadabbur' | 'general' | string; // string for custom template IDs
  date: number;
  content: any;
  labels?: string[];
  isChecklist?: boolean;
  checklistItems?: { id: string; text: string; isCompleted: boolean }[];
  images?: (string | Blob)[];
  drawings?: (string | Blob)[];
  audioData?: (string | Blob)[];
  color?: string;
}

export interface NoteIndexItem {
  id: string;
  date: number;
  title: string;
  labels: string[];
  type: string;
  textContent: string;
}

export interface CustomTemplate {
  id: string;
  name: string;
  fields: { 
    id: string; 
    label: string; 
    type: 'text' | 'textarea' | 'checklist';
    width?: 'full' | 'half' | 'third';
    size?: 'small' | 'medium' | 'large';
  }[];
}

export interface DictionaryTerm {
  id: string;
  term: string;
  definition: string;
  category: string;
  date: number;
}

export interface InboxMessage {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  unlockDate: number;
  isRead: boolean;
  audioData?: (string | Blob)[];
}

export interface TaskList {
  id: string;
  name: string;
  createdAt: number;
}

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Goal {
  id: string;
  title: string;
  details?: string;
  type: 'reading' | 'memorization' | 'hours' | 'general';
  target: number;
  current: number;
  createdAt: number;
  startDate?: number;
  deadline?: number;
  reminder?: number;
  repeat?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  customRepeatDays?: number[]; // Array of days (0-6) for custom repeat
  isCompleted: boolean;
  subtasks?: Subtask[];
  priority?: 'urgent-important' | 'not-urgent-important' | 'urgent-not-important' | 'not-urgent-not-important';
  isHabit?: boolean;
  habitDays?: number[]; // 0-6 for days of week
  habitStreak?: number;
  lastCompletedDate?: number;
  listId?: string; // Reference to TaskList
  linkedHabitId?: string; // Reference to a Habit
  isStarred?: boolean;
  notifiedStart?: boolean;
  notifiedDeadline?: boolean;
  notifiedReminder?: boolean;
}

export interface AudioRecord {
  id: string;
  title: string;
  date: number;
  audioData: string | Blob | null; // Base64 encoded audio or Blob
  transcript: string;
}

export interface DailyAyah {
  id: string;
  text: string;
  surah: string;
  ayahNumber: number;
  tafsir: string;
  source?: string;
}

export interface FlashcardCategory {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
}

export interface Flashcard {
  id: string;
  categoryId: string;
  front: string;
  back: string;
  color: string;
  createdAt: number;
  lastReviewed?: number;
  nextReview?: number;
  isFlagged?: boolean;
  repeatPattern?: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
  customDays?: number; // interval in days
  customRepeatDays?: number[]; // Array of days (0-6) for custom repeat
}

export interface UserSettings {
  id: string;
  theme: 'olive' | 'blue' | 'burgundy' | 'midnight' | 'gold' | 'rose' | 'turquoise' | 'purple' | 'light-green' | 'lemon' | 'beige' | 'antique-brown' | 'orange' | 'sky-blue' | 'gray' | 'rosy-pink';
  isDarkMode: boolean;
  hideSettingsIntro?: boolean;
  hideDictionaryIntro?: boolean;
  hideNotesIntro?: boolean;
  hideInboxIntro?: boolean;
  hideGoalsIntro?: boolean;
  hideAudioIntro?: boolean;
  hideFlashcardsIntro?: boolean;
  hideAppearanceIntro?: boolean;
}

// Create separate stores for each entity type for efficient retrieval
const stores = {
  notes: localforage.createInstance({ name: 'TalibAlIlm', storeName: 'notes' }),
  dictionary: localforage.createInstance({ name: 'TalibAlIlm', storeName: 'dictionary' }),
  inbox: localforage.createInstance({ name: 'TalibAlIlm', storeName: 'inbox' }),
  taskLists: localforage.createInstance({ name: 'TalibAlIlm', storeName: 'taskLists' }),
  goals: localforage.createInstance({ name: 'TalibAlIlm', storeName: 'goals' }),
  audio: localforage.createInstance({ name: 'TalibAlIlm', storeName: 'audio' }),
  customTemplates: localforage.createInstance({ name: 'TalibAlIlm', storeName: 'customTemplates' }),
  ayahs: localforage.createInstance({ name: 'TalibAlIlm', storeName: 'ayahs' }),
  flashcardCategories: localforage.createInstance({ name: 'TalibAlIlm', storeName: 'flashcardCategories' }),
  flashcards: localforage.createInstance({ name: 'TalibAlIlm', storeName: 'flashcards' }),
  settings: localforage.createInstance({ name: 'TalibAlIlm', storeName: 'settings' })
};

let migrationPromise: Promise<void> | null = null;

async function safeSetItem(store: LocalForage, key: string, value: any) {
  try {
    await store.setItem(key, value);
  } catch (error: any) {
    if (error.name === 'QuotaExceededError' || error.message?.toLowerCase().includes('quota')) {
      throw new Error('عذراً، مساحة التخزين ممتلئة. يرجى حذف بعض الملفات (مثل الصوتيات أو الصور) لتوفير مساحة.');
    }
    throw new Error('حدث خطأ أثناء حفظ البيانات: ' + (error.message || 'خطأ غير معروف'));
  }
}

async function migrateData() {
  const legacyStore = localforage.createInstance({ name: 'TalibAlIlm', storeName: 'notes_store' });
  const migratedFlag = await stores.settings.getItem('data_migrated_v2');
  if (migratedFlag) return;

  await legacyStore.iterate(async (value: any, key: string) => {
    if (key === 'user_settings') {
      await safeSetItem(stores.settings, key, value);
    } else if (key.startsWith('dict_')) {
      await safeSetItem(stores.dictionary, key, value);
    } else if (key.startsWith('inbox_')) {
      await safeSetItem(stores.inbox, key, value);
    } else if (key.startsWith('tasklist_')) {
      await safeSetItem(stores.taskLists, key, value);
    } else if (key.startsWith('goal_')) {
      await safeSetItem(stores.goals, key, value);
    } else if (key.startsWith('audio_')) {
      await safeSetItem(stores.audio, key, value);
    } else if (key.startsWith('template_')) {
      await safeSetItem(stores.customTemplates, key, value);
    } else if (key.startsWith('ayah_')) {
      await safeSetItem(stores.ayahs, key, value);
    } else if (key.startsWith('fc_cat_')) {
      await safeSetItem(stores.flashcardCategories, key, value);
    } else if (key.startsWith('fc_card_')) {
      await safeSetItem(stores.flashcards, key, value);
    } else {
      // Assume it's a note
      await safeSetItem(stores.notes, key, value);
    }
  });

  await safeSetItem(stores.settings, 'data_migrated_v2', true);
}

const ensureMigrated = () => {
  if (!migrationPromise) {
    migrationPromise = migrateData();
  }
  return migrationPromise;
};

let memoryIndex: NoteIndexItem[] | null = null;

export const db = {
  notes: {
    async getIndex(): Promise<NoteIndexItem[]> {
      if (memoryIndex) return memoryIndex;
      await ensureMigrated();
      let index = await stores.settings.getItem<NoteIndexItem[]>('notes_index');
      if (!index) {
        index = [];
        await stores.notes.iterate((note: Note) => {
          index!.push({
            id: note.id,
            date: note.date,
            title: note.title || '',
            labels: note.labels || [],
            type: note.type,
            textContent: typeof note.content?.text === 'string' ? note.content.text.substring(0, 1000) : ''
          });
        });
        index.sort((a, b) => b.date - a.date);
        await stores.settings.setItem('notes_index', index);
      } else {
        index.sort((a, b) => b.date - a.date);
      }
      memoryIndex = index;
      return index;
    },
    async updateIndex(note: Note) {
      const index = await this.getIndex();
      const existingIdx = index.findIndex(item => item.id === note.id);
      const newItem: NoteIndexItem = {
        id: note.id,
        date: note.date,
        title: note.title || '',
        labels: note.labels || [],
        type: note.type,
        textContent: typeof note.content?.text === 'string' ? note.content.text.substring(0, 1000) : ''
      };
      
      if (existingIdx >= 0) {
        index[existingIdx] = newItem;
      } else {
        index.push(newItem);
      }
      index.sort((a, b) => b.date - a.date);
      memoryIndex = index;
      await stores.settings.setItem('notes_index', index);
    },
    async removeFromIndex(id: string) {
      const index = await this.getIndex();
      const newIndex = index.filter(item => item.id !== id);
      memoryIndex = newIndex;
      await stores.settings.setItem('notes_index', newIndex);
    },
    async getAll(): Promise<Note[]> {
      await ensureMigrated();
      const notes: Note[] = [];
      await stores.notes.iterate((value: Note) => {
        notes.push(value);
      });
      return notes.sort((a, b) => b.date - a.date);
    },
    async getPaginated(page: number, limit: number, searchQuery: string = "", category: string | null = null): Promise<{ notes: Note[], total: number, allCategories: string[] }> {
      const index = await this.getIndex();
      
      const lowerQuery = searchQuery.toLowerCase();
      const categoriesSet = new Set<string>();
      const filtered: NoteIndexItem[] = [];
      
      for (let i = 0; i < index.length; i++) {
        const n = index[i];
        
        if (n.labels) {
          for (let j = 0; j < n.labels.length; j++) {
            categoriesSet.add(n.labels[j]);
          }
        }
        
        let matchesSearch = true;
        if (lowerQuery) {
          matchesSearch = 
            (n.title && n.title.toLowerCase().includes(lowerQuery)) || 
            (n.textContent && n.textContent.toLowerCase().includes(lowerQuery)) || 
            (n.labels && n.labels.some(l => l.toLowerCase().includes(lowerQuery)));
        }
        
        const matchesCategory = category ? (n.labels && n.labels.includes(category)) : true;
        
        if (matchesSearch && matchesCategory) {
          filtered.push(n);
        }
      }
      
      const start = (page - 1) * limit;
      const sliced = filtered.slice(start, start + limit);
      
      const notes = await Promise.all(sliced.map(item => stores.notes.getItem<Note>(item.id)));
      
      return {
        notes: notes.filter(Boolean) as Note[],
        total: filtered.length,
        allCategories: Array.from(categoriesSet)
      };
    },
    async getCount(): Promise<number> {
      const index = await this.getIndex();
      return index.length;
    },
    async save(note: Note): Promise<Note> {
      await ensureMigrated();
      await safeSetItem(stores.notes, note.id, note);
      await this.updateIndex(note);
      return note;
    },
    async saveMany(notes: Note[]): Promise<void> {
      await ensureMigrated();
      const index = await this.getIndex();
      
      for (const note of notes) {
        await safeSetItem(stores.notes, note.id, note);
        const existingIdx = index.findIndex(item => item.id === note.id);
        const newItem: NoteIndexItem = {
          id: note.id,
          date: note.date,
          title: note.title || '',
          labels: note.labels || [],
          type: note.type,
          textContent: typeof note.content?.text === 'string' ? note.content.text.substring(0, 1000) : ''
        };
        if (existingIdx >= 0) {
          index[existingIdx] = newItem;
        } else {
          index.push(newItem);
        }
      }
      
      index.sort((a, b) => b.date - a.date);
      memoryIndex = index;
      await stores.settings.setItem('notes_index', index);
    },
    async delete(id: string): Promise<void> {
      await ensureMigrated();
      await stores.notes.removeItem(id);
      await this.removeFromIndex(id);
    }
  },
  dictionary: {
    async getAll(): Promise<DictionaryTerm[]> {
      await ensureMigrated();
      const terms: DictionaryTerm[] = [];
      await stores.dictionary.iterate((value: DictionaryTerm) => {
        terms.push(value);
      });
      return terms.sort((a, b) => b.date - a.date);
    },
    async save(term: DictionaryTerm): Promise<DictionaryTerm> {
      await ensureMigrated();
      const id = term.id.startsWith('dict_') ? term.id : `dict_${term.id}`;
      const termToSave = { ...term, id };
      await safeSetItem(stores.dictionary, id, termToSave);
      return termToSave;
    },
    async delete(id: string): Promise<void> {
      await ensureMigrated();
      await stores.dictionary.removeItem(id);
    },
    async getPaginated(page: number, limit: number, searchQuery: string = "", category: string | null = null): Promise<{ terms: DictionaryTerm[], total: number, allCategories: string[] }> {
      await ensureMigrated();
      const allTerms: DictionaryTerm[] = [];
      const categoriesSet = new Set<string>();
      
      await stores.dictionary.iterate((value: DictionaryTerm) => {
        allTerms.push(value);
        if (value.category) categoriesSet.add(value.category);
      });
      
      allTerms.sort((a, b) => b.date - a.date);
      
      const lowerQuery = searchQuery.toLowerCase();
      const filtered = allTerms.filter(t => {
        const matchesSearch = !lowerQuery || 
          t.term.toLowerCase().includes(lowerQuery) || 
          t.definition.toLowerCase().includes(lowerQuery);
        const matchesCategory = !category || t.category === category;
        return matchesSearch && matchesCategory;
      });
      
      const start = (page - 1) * limit;
      const sliced = filtered.slice(start, start + limit);
      
      return {
        terms: sliced,
        total: filtered.length,
        allCategories: Array.from(categoriesSet)
      };
    }
  },
  inbox: {
    async getAll(): Promise<InboxMessage[]> {
      await ensureMigrated();
      const messages: InboxMessage[] = [];
      await stores.inbox.iterate((value: InboxMessage) => {
        messages.push(value);
      });
      return messages.sort((a, b) => b.createdAt - a.createdAt);
    },
    async save(message: InboxMessage): Promise<InboxMessage> {
      await ensureMigrated();
      const id = message.id.startsWith('inbox_') ? message.id : `inbox_${message.id}`;
      const msgToSave = { ...message, id };
      await safeSetItem(stores.inbox, id, msgToSave);
      return msgToSave;
    },
    async delete(id: string): Promise<void> {
      await ensureMigrated();
      await stores.inbox.removeItem(id);
    }
  },
  taskLists: {
    async getAll(): Promise<TaskList[]> {
      await ensureMigrated();
      const lists: TaskList[] = [];
      await stores.taskLists.iterate((value: TaskList) => {
        lists.push(value);
      });
      return lists.sort((a, b) => a.createdAt - b.createdAt);
    },
    async save(list: TaskList): Promise<TaskList> {
      await ensureMigrated();
      const id = list.id.startsWith('tasklist_') ? list.id : `tasklist_${list.id}`;
      const listToSave = { ...list, id };
      await safeSetItem(stores.taskLists, id, listToSave);
      return listToSave;
    },
    async delete(id: string): Promise<void> {
      await ensureMigrated();
      await stores.taskLists.removeItem(id);
    }
  },
  goals: {
    async getAll(): Promise<Goal[]> {
      await ensureMigrated();
      const goals: Goal[] = [];
      await stores.goals.iterate((value: Goal) => {
        goals.push(value);
      });
      return goals.sort((a, b) => b.createdAt - a.createdAt);
    },
    async save(goal: Goal): Promise<Goal> {
      await ensureMigrated();
      const id = goal.id.startsWith('goal_') ? goal.id : `goal_${goal.id}`;
      const goalToSave = { ...goal, id };
      await safeSetItem(stores.goals, id, goalToSave);
      return goalToSave;
    },
    async delete(id: string): Promise<void> {
      await ensureMigrated();
      await stores.goals.removeItem(id);
    }
  },
  audio: {
    async getAll(): Promise<AudioRecord[]> {
      await ensureMigrated();
      const records: AudioRecord[] = [];
      await stores.audio.iterate((value: AudioRecord) => {
        records.push(value);
      });
      return records.sort((a, b) => b.date - a.date);
    },
    async save(record: AudioRecord): Promise<AudioRecord> {
      await ensureMigrated();
      const id = record.id.startsWith('audio_') ? record.id : `audio_${record.id}`;
      const recordToSave = { ...record, id };
      await safeSetItem(stores.audio, id, recordToSave);
      return recordToSave;
    },
    async delete(id: string): Promise<void> {
      await ensureMigrated();
      await stores.audio.removeItem(id);
    }
  },
  customTemplates: {
    async getAll(): Promise<CustomTemplate[]> {
      await ensureMigrated();
      const templates: CustomTemplate[] = [];
      await stores.customTemplates.iterate((value: CustomTemplate) => {
        templates.push(value);
      });
      return templates;
    },
    async save(template: CustomTemplate): Promise<CustomTemplate> {
      await ensureMigrated();
      const id = template.id.startsWith('template_') ? template.id : `template_${template.id}`;
      const templateToSave = { ...template, id };
      await safeSetItem(stores.customTemplates, id, templateToSave);
      return templateToSave;
    },
    async delete(id: string): Promise<void> {
      await ensureMigrated();
      await stores.customTemplates.removeItem(id);
    }
  },
  ayahs: {
    async getAll(): Promise<DailyAyah[]> {
      await ensureMigrated();
      const ayahs: DailyAyah[] = [];
      await stores.ayahs.iterate((value: DailyAyah) => {
        ayahs.push(value);
      });
      
      if (ayahs.length === 0) {
        // Seed initial ayahs
        const initialAyahs: DailyAyah[] = [
          {
            id: 'ayah_1',
            text: 'وَلا تَحسَبَنَّ اللَّهَ غافِلًا عَمّا يَعمَلُ الظّالِمونَ إِنَّما يُؤَخِّرُهُم لِيَومٍ تَشخَصُ فيهِ الأَبصارُ',
            surah: 'إبراهيم',
            ayahNumber: 42,
            tafsir: 'ولا تظنن - أيها الرسول - أن الله إذ يؤخر عذاب الظالمين غافل عما يعمله الظالمون من التكذيب والصد عن سبيل الله وغير ذلك، بل هو عالم بذلك، لا يخفى عليه منه شيء، إنما يؤخر عذابهم إلى يوم القيامة، ذلك اليوم الذي ترتفع فيه الأبصار خوفًا من هول ما تشاهده.',
            source: 'المختصر في التفسير'
          },
          {
            id: 'ayah_2',
            text: 'أَلَم يَأنِ لِلَّذينَ آمَنوا أَن تَخشَعَ قُلوبُهُم لِذِكرِ اللَّهِ وَما نَزَلَ مِنَ الحَقِّ وَلا يَكونوا كَالَّذينَ أوتُوا الكِتابَ مِن قَبلُ فَطالَ عَلَيهِمُ الأَمَدُ فَقَسَت قُلوبُهُم وَكَثيرٌ مِنهُم فاسِقونَ',
            surah: 'الحديد',
            ayahNumber: 16,
            tafsir: 'ألم يَحِنْ للذين آمنوا بالله ورسوله أن تلين قلوبهم وتطمئنّ لذكر الله سبحانه، وما نزل من القرآن من وعد أو وعيد، ولا يكونوا مثل الذين أُعطوا التوراة من اليهود، والذين أُعطوا الإنجيل من النصارى، في قسوة القلوب، فطال الزمن بينهم وبين بعثة أنبيائهم فقست بسبب ذلك قلوبهم، وكثير منهم خارجون عن طاعة الله إلى معصيته؟!',
            source: 'المختصر في التفسير'
          },
          {
            id: 'ayah_3',
            text: 'وَقالَ لَهُم نَبِيُّهُم إِنَّ اللَّهَ قَد بَعَثَ لَكُم طالوتَ مَلِكًا قالوا أَنّى يَكونُ لَهُ المُلكُ عَلَينا وَنَحنُ أَحَقُّ بِالمُلكِ مِنهُ وَلَم يُؤتَ سَعَةً مِنَ المالِ قالَ إِنَّ اللَّهَ اصطَفاهُ عَلَيكُم وَزادَهُ بَسطَةً فِي العِلمِ وَالجِسمِ وَاللَّهُ يُؤتي مُلكَهُ مَن يَشاءُ وَاللَّهُ واسِعٌ عَليمٌ',
            surah: 'البقرة',
            ayahNumber: 247,
            tafsir: 'وقال لهم نبيهم: إن الله قد أقام لكم طالوت ملكًا عليكم لتقاتلوا تحت رايته، قال أشرافهم مستنكرين هذا الاختيار ومعترضين عليه: كيف يكون له المُلك علينا، ونحن أولى بالمُلك منه؛ إذ لم يكن من أبناء الملوك، ولم يُعْطَ مالًا واسعًا يستعين به على الملك؟! قال لهم نبيهم: إن الله اختاره عليكم، وزاده عليكم سعة في العلم وقوة في الجسم، والله يؤتي ملكه من يشاء بحكمته ورحمته، والله واسع الفضل يعطي من يشاء، عليم بمن يستحقه من خلقه.',
            source: 'المختصر في التفسير'
          },
          {
            id: 'ayah_4',
            text: 'شَهِدَ اللَّهُ أَنَّهُ لا إِلهَ إِلّا هُوَ وَالمَلائِكَةُ وَأُولُو العِلمِ قائِمًا بِالقِسطِ لا إِلهَ إِلّا هُوَ العَزيزُ الحَكيمُ',
            surah: 'آل عمران',
            ayahNumber: 18,
            tafsir: 'شهد الله على أنه هو الإله المعبود بحق دون سواه، وذلك بما أقام من الآيات الشرعية والكونية الدالة على ألوهيته، وشهد على ذلك الملائكة، وشهد أهل العلم على ذلك ببيانهم للتوحيد ودعوتهم إليه، فشهدوا على أعظم مشهود به وهو توحيد الله وقيامه تعالى بالعدل في خلقه وشرعه، لا إله إلا هو العزيز الذي لا يغالبه أحد، الحكيم في خلقه وتدبيره وتشريعه.',
            source: 'المختصر في التفسير'
          },
          {
            id: 'ayah_5',
            text: 'وَإِنّي لَغَفّارٌ لِمَن تابَ وَآمَنَ وَعَمِلَ صالِحًا ثُمَّ اهتَدى',
            surah: 'طه',
            ayahNumber: 82,
            tafsir: 'وإني لكثير المغفرة والعفو لمن تاب إليّ وآمن، وعمل عملًا صالحًا، ثم استقام على الحق.',
            source: 'المختصر في التفسير'
          },
          {
            id: 'ayah_6',
            text: 'وَمِنَ النّاسِ وَالدَّوابِّ وَالأَنعامِ مُختَلِفٌ أَلوانُهُ كَذلِكَ إِنَّما يَخشَى اللَّهَ مِن عِبادِهِ العُلَماءُ إِنَّ اللَّهَ عَزيزٌ غَفورٌ',
            surah: 'فاطر',
            ayahNumber: 28,
            tafsir: 'ومن الناس، ومن الدواب، ومن الأنعام (الإبل، والبقر، والغنم) مختلف ألوانه مثل ذلك المذكور، إنما يعظم مقام الله تعالى ويخشاه العالمون به سبحانه؛ لأنهم عرفوا صفاته وشرعه ودلائل قدرته، إن الله عزيز لا يغالبه أحد، غفور لذنوب من تاب من عباده.',
            source: 'المختصر في التفسير'
          },
          {
            id: 'ayah_7',
            text: 'قالَ هُم أُولاءِ عَلى أَثَري وَعَجِلتُ إِلَيكَ رَبِّ لِتَرضى',
            surah: 'طه',
            ayahNumber: 84,
            tafsir: 'قال موسى عليه السلام: ها هم ورائي وسيلحقونني، وسبقت قومي إليك لترضى عني بمسارعتي إليك.',
            source: 'المختصر في التفسير'
          }
        ];
        
        for (const a of initialAyahs) {
          await this.save(a);
          ayahs.push(a);
        }
      }
      
      return ayahs;
    },
    async save(ayah: DailyAyah): Promise<DailyAyah> {
      await ensureMigrated();
      const id = ayah.id.startsWith('ayah_') ? ayah.id : `ayah_${ayah.id}`;
      const ayahToSave = { ...ayah, id };
      await safeSetItem(stores.ayahs, id, ayahToSave);
      return ayahToSave;
    },
    async delete(id: string): Promise<void> {
      await ensureMigrated();
      await stores.ayahs.removeItem(id);
    },
    async getRandom(): Promise<DailyAyah | null> {
      const ayahs = await this.getAll();
      if (ayahs.length === 0) return null;
      
      // Use the current date as a seed so the ayah stays the same for the whole day
      const today = new Date();
      const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
      const randomIndex = seed % ayahs.length;
      
      return ayahs[randomIndex];
    }
  },
  flashcardCategories: {
    async getAll(): Promise<FlashcardCategory[]> {
      await ensureMigrated();
      const categories: FlashcardCategory[] = [];
      await stores.flashcardCategories.iterate((value: FlashcardCategory) => {
        categories.push(value);
      });
      return categories.sort((a, b) => a.createdAt - b.createdAt);
    },
    async save(category: FlashcardCategory): Promise<FlashcardCategory> {
      await ensureMigrated();
      const id = category.id.startsWith('fc_cat_') ? category.id : `fc_cat_${category.id}`;
      const categoryToSave = { ...category, id };
      await safeSetItem(stores.flashcardCategories, id, categoryToSave);
      return categoryToSave;
    },
    async delete(id: string): Promise<void> {
      await ensureMigrated();
      await stores.flashcardCategories.removeItem(id);
    }
  },
  flashcards: {
    async getAll(): Promise<Flashcard[]> {
      await ensureMigrated();
      const cards: Flashcard[] = [];
      await stores.flashcards.iterate((value: Flashcard) => {
        cards.push(value);
      });
      return cards.sort((a, b) => b.createdAt - a.createdAt);
    },
    async save(card: Flashcard): Promise<Flashcard> {
      await ensureMigrated();
      const id = card.id.startsWith('fc_card_') ? card.id : `fc_card_${card.id}`;
      const cardToSave = { ...card, id };
      await safeSetItem(stores.flashcards, id, cardToSave);
      return cardToSave;
    },
    async delete(id: string): Promise<void> {
      await ensureMigrated();
      await stores.flashcards.removeItem(id);
    },
    async getPaginated(page: number, limit: number, categoryId: string = "all"): Promise<{ cards: Flashcard[], total: number }> {
      await ensureMigrated();
      const allCards: Flashcard[] = [];
      
      await stores.flashcards.iterate((value: Flashcard) => {
        allCards.push(value);
      });
      
      allCards.sort((a, b) => b.createdAt - a.createdAt);
      
      const filtered = allCards.filter(c => {
        if (categoryId === "all") return true;
        if (categoryId === "flagged") return c.isFlagged;
        if (categoryId === "uncategorized") return !c.categoryId;
        return c.categoryId === categoryId;
      });
      
      const start = (page - 1) * limit;
      const sliced = filtered.slice(start, start + limit);
      
      return {
        cards: sliced,
        total: filtered.length
      };
    }
  },
  settings: {
    async get(): Promise<UserSettings> {
      await ensureMigrated();
      const settings = await stores.settings.getItem<UserSettings>('user_settings');
      if (settings) return settings;
      
      // Default settings
      return {
        id: 'user_settings',
        theme: 'olive',
        isDarkMode: false,
      };
    },
    async save(settings: UserSettings): Promise<UserSettings> {
      await ensureMigrated();
      await safeSetItem(stores.settings, 'user_settings', settings);
      return settings;
    }
  },
  async resetAll(): Promise<void> {
    const allStores = Object.values(stores);
    for (const store of allStores) {
      await store.clear();
    }
    // Also clear memory index
    memoryIndex = null;
    // Reload page to re-initialize everything
    window.location.reload();
  }
};
