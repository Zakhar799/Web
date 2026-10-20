#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'node:fs';

const program = new Command();

// Універсальна функція для безпечного читання JSON-файлу
function loadSurveyData(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            console.error(`Помилка: Файл "${filePath}" не знайдено.`);
            process.exit(1);
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`Помилка читання або некоректний формат JSON: ${error.message}`);
        process.exit(1);
    }
}

program
    .name('survey-cli')
    .description('Програма для перегляду та аналізу опитувань')
    .version('1.0.0');

// Глобальна опція для шляху до файлу (працює з будь-якою командою, за замовчуванням data.json)
program.option('-f, --file <path>', 'шлях до JSON-файлу', 'data.json');


// --- ЗАГАЛЬНІ МОЖЛИВОСТІ ---

// 1. Перелік питань з можливістю обмежити кількість (--limit)
program
    .command('list')
    .description('Показати список питань опитування')
    .option('-l, --limit <number>', 'обмежити кількість питань', parseInt)
    .action((options) => {
        const opts = program.opts();
        const data = loadSurveyData(opts.file);

        let questions = data.questions;
        if (options.limit) {
            questions = questions.slice(0, options.limit);
        }

        console.log(`Опитування: ${data.title}`);
        questions.forEach((q, i) => {
            console.log(`${i + 1}. [${q.questionId}] (${q.type}) ${q.text}`);
        });
    });

// 2. Один елемент: показати конкретне питання за його ID
program
    .command('get <questionId>')
    .description('Показати повну інформацію про конкретне питання за ID')
    .action((questionId) => {
        const opts = program.opts();
        const data = loadSurveyData(opts.file);

        const question = data.questions.find(q => q.questionId === questionId);
        if (!question) {
            console.error(`Помилка: Питання з ID "${questionId}" не знайдено.`);
            process.exit(1);
        }

        console.log(JSON.stringify(question, null, 2));
    });

// 3. Окреме поле: показати значення конкретного поля (наприклад, title)
program
    .command('field <fieldName>')
    .description('Показати значення головного поля документу (наприклад, title або description)')
    .action((fieldName) => {
        const opts = program.opts();
        const data = loadSurveyData(opts.file);

        if (!(fieldName in data)) {
            console.error(`Помилка: Поле "${fieldName}" у файлі відсутнє.`);
            process.exit(1);
        }

        console.log(`Значення поля "${fieldName}":`, data[fieldName]);
    });


// --- МОЖЛИВОСТІ ВАРІАНТА 7 (Опитування) ---

// 1. Перелік питань з відбором за обов'язковістю (--required) та типом (--type)
program
    .command('filter-questions')
    .description('Фільтрувати питання за обов\'язковістю або типом')
    .option('-r, --required', 'тільки обов\'язкові питання')
    .option('-t, --type <type>', 'фільтр за типом (scale, multiple_choice, single_choice, free_text)')
    .action((options) => {
        const opts = program.opts();
        const data = loadSurveyData(opts.file);

        let result = data.questions;
        if (options.required) {
            result = result.filter(q => q.isRequired === true);
        }
        if (options.type) {
            result = result.filter(q => q.type === options.type);
        }

        console.log(`Знайдено питань: ${result.length}`);
        result.forEach((q, i) => {
            console.log(`${i + 1}. [${q.questionId}] ${q.text} (тип: ${q.type})`);
        });
    });

// 2. Відповіді всіх респондентів на обране питання
program
    .command('answers <questionId>')
    .description('Показати відповіді всіх респондентів на задане питання')
    .action((questionId) => {
        const opts = program.opts();
        const data = loadSurveyData(opts.file);

        const question = data.questions.find(q => q.questionId === questionId);
        if (!question) {
            console.error(`Помилка: Питання з ID "${questionId}" не знайдено.`);
            process.exit(1);
        }

        console.log(`Питання: "${question.text}"`);
        data.responses.forEach(resp => {
            const ans = resp.answers.find(a => a.questionId === questionId);
            const val = ans ? ans.value : 'немає відповіді';
            console.log(`- Респондент [${resp.respondentId}]:`, val);
        });
    });

// 3. Усі відповіді одного респондента разом із текстом питань
program
    .command('respondent <respondentId>')
    .description('Показати всі відповіді конкретного респондента з текстом питань')
    .action((respondentId) => {
        const opts = program.opts();
        const data = loadSurveyData(opts.file);

        const resp = data.responses.find(r => r.respondentId === respondentId);
        if (!resp) {
            console.error(`Помилка: Респондента з ID "${respondentId}" не знайдено.`);
            process.exit(1);
        }

        console.log(`Респондент: ${resp.respondentId} (дата: ${resp.submittedAt})`);
        resp.answers.forEach(ans => {
            const q = data.questions.find(que => que.questionId === ans.questionId);
            const text = q ? q.text : 'Питання не знайдено';
            console.log(`  • Питання: "${text}"\n    Відповідь:`, ans.value);
        });
    });

program.parse(process.argv);