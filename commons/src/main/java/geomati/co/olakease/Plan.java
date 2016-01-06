package geomati.co.olakease;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.Date;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOUtils;

public class Plan extends HttpServlet {
	private static final long serialVersionUID = 1L;

	private File planFile = new File(System.getProperty("user.home")
			+ "/.olakease/", "plan.json");

	// private File planFile = new File(
	// "/home/fergonco/b/java/olakease/olakease-app/plan.json");

	@Override
	protected void doGet(HttpServletRequest req, HttpServletResponse resp)
			throws ServletException, IOException {
		FileInputStream fis = new FileInputStream(planFile);
		resp.setContentType("application/json");
		resp.setCharacterEncoding("UTF-8");
		try {
			IOUtils.copy(fis, resp.getOutputStream());
		} finally {
			fis.close();
		}
	}

	@Override
	protected void doPost(HttpServletRequest req, HttpServletResponse resp)
			throws ServletException, IOException {
		File backupFile = new File(planFile.getParentFile(), "plan-"
				+ new Date().getTime() + ".json");
		FileUtils.copyFile(planFile, backupFile);

		BufferedReader reader = req.getReader();
		OutputStream out = new FileOutputStream(planFile);
		IOUtils.copy(reader, out, "UTF-8");

		out.close();

		resp.setStatus(HttpServletResponse.SC_OK);
	}

}
