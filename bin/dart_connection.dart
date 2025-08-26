import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

void main() async {
  final session = await login();
  if (session == null) {
    print("Good bye");
    return;
  }
  await menuLoop(session);
  print("----- Bye ---------");
}

class Session {
  final int userId;
  final String username;
  Session(this.userId, this.username);
}

Future<Session?> login() async {
  print("===== Login =====");
  stdout.write("Username: ");
  final username = stdin.readLineSync()?.trim();
  stdout.write("Password: ");
  final password = stdin.readLineSync()?.trim();

  if (username == null ||
      password == null ||
      username.isEmpty ||
      password.isEmpty) {
    print("Incomplete input");
    return null;
  }

  final url = Uri.parse('http://localhost:3000/login');
  final resp = await http.post(
    url,
    body: {"username": username, "password": password},
  );
  if (resp.statusCode == 200) {
    final data = jsonDecode(resp.body);
    if (data is Map && data['ok'] == true) {
      print("Login OK\n");
      return Session(data['userId'] as int, data['username'] as String);
    }
    print("Unexpected response: ${resp.body}");
    return null;
  } else {
    print(resp.body);
    return null;
  }
}

Future<void> menuLoop(Session s) async {
  while (true) {
    print("========= Expense Tracking App =========");
    print("1. Show all");
    print("2. Today's expense");
    print("3. Search");
    print("4. Add expense");
    print("5. Delete expense");
    print("6. Exit");
    stdout.write("Choose... ");

    final choice = stdin.readLineSync()?.trim();
    if (choice == '1') {
      await showAll(s.userId);
    } else if (choice == '2') {
      await showToday(s.userId);
    } else if (choice == '3') {
      await searchExpense(s.userId);
    } else if (choice == '4') {
      await addExpense(s.userId);
    } else if (choice == '5') {
      await deleteExpense(s.userId);
    } else if (choice == '6') {
      break;
    } else {
      print("Invalid choice\n");
    }
  }
}

Future<void> showAll(int userId) async {
  final url = Uri.parse('http://localhost:3000/expenses?userId=$userId');
  final resp = await http.get(url);
  if (resp.statusCode != 200) {
    print("Error: ${resp.body}\n");
    return;
  }
  final data = jsonDecode(resp.body) as Map<String, dynamic>;
  final rows = (data['rows'] as List).cast<Map<String, dynamic>>();
  final total = data['total'];
  print("------------ All expenses ------------");
  for (int i = 0; i < rows.length; i++) {
    final r = rows[i];
    print("${r['id']}. ${r['item']} : ${r['paid']}฿ : ${r['date']}");
  }
  print("Total expenses = ${total}฿\n");
}

Future<void> showToday(int userId) async {
  final url = Uri.parse('http://localhost:3000/expenses/today?userId=$userId');
  final resp = await http.get(url);
  if (resp.statusCode != 200) {
    print("Error: ${resp.body}\n");
    return;
  }
  final data = jsonDecode(resp.body) as Map<String, dynamic>;
  final rows = (data['rows'] as List).cast<Map<String, dynamic>>();
  final total = data['total'];
  print("---------- Today's expenses ----------");
  for (int i = 0; i < rows.length; i++) {
    final r = rows[i];
    print("${r['id']}. ${r['item']} : ${r['paid']}฿ : ${r['date']}");
  }
  print("Total expenses = ${total}฿\n");
}

Future<void> searchExpense(int userId) async {
  stdout.write("Enter search keyword: ");
  final keyword = stdin.readLineSync()?.trim();
  if (keyword == null || keyword.isEmpty) {
    print("Keyword cannot be empty\n");
    return;
  }
  final url = Uri.parse(
    'http://localhost:3000/expenses/search?userId=$userId&keyword=$keyword',
  );
  final resp = await http.get(url);
  if (resp.statusCode != 200) {
    print("Error: ${resp.body}\n");
    return;
  }
  final data = jsonDecode(resp.body) as Map<String, dynamic>;
  final rows = (data['rows'] as List).cast<Map<String, dynamic>>();
  final total = data['total'];
  print("---------- Search results ----------");
  if (rows.isEmpty) {
    print("No items found containing '$keyword'\n");
    return;
  }
  for (int i = 0; i < rows.length; i++) {
    final r = rows[i];
    print("${r['id']}. ${r['item']} : ${r['paid']}฿ : ${r['date']}");
  }
  print("Total expenses = ${total}฿\n");
}

Future<void> addExpense(int userId) async {
  stdout.write("Enter item name: ");
  final item = stdin.readLineSync()?.trim();
  stdout.write("Enter amount paid: ");
  final paid = stdin.readLineSync()?.trim();
  stdout.write("Enter date (YYYY-MM-DD): ");
  final date = stdin.readLineSync()?.trim();
  if (item == null ||
      paid == null ||
      date == null ||
      item.isEmpty ||
      paid.isEmpty ||
      date.isEmpty) {
    print("Incomplete input\n");
    return;
  }
  final url = Uri.parse('http://localhost:3000/expenses');
  final resp = await http.post(
    url,
    body: {
      "userId": userId.toString(),
      "item": item,
      "paid": paid,
      "date": date,
    },
  );
  if (resp.statusCode != 200) {
    print("Error: ${resp.body}\n");
    return;
  }
  final data = jsonDecode(resp.body);
  if (data['ok'] == true) {
    print("Expense added successfully (ID: ${data['id']})\n");
  } else {
    print("Unexpected response: ${resp.body}\n");
  }
}

Future<void> deleteExpense(int userId) async {
  stdout.write("Enter expense ID to delete: ");
  final id = stdin.readLineSync()?.trim();
  if (id == null || id.isEmpty) {
    print("ID cannot be empty\n");
    return;
  }
  final url = Uri.parse('http://localhost:3000/expenses/$id?userId=$userId');
  final resp = await http.delete(url);
  if (resp.statusCode != 200) {
    print("Error: ${resp.body}\n");
    return;
  }
  final data = jsonDecode(resp.body);
  if (data['ok'] == true) {
    print("Expense deleted successfully\n");
  } else {
    print("Unexpected response: ${resp.body}\n");
  }
}
